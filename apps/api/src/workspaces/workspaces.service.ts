import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { requireAssignableRole, requireManageableMember, requireWorkspaceAdmin } from './workspace.policy';

type Tx = Prisma.TransactionClient;
const userFields = { id: true, email: true, displayName: true } as const;
const roleLabels: Record<WorkspaceRole, string> = { OWNER: 'Chủ sở hữu', ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', MEMBER: 'Thành viên', VIEWER: 'Người xem' };
const invitationFields = { id: true, email: true, role: true, expiresAt: true, acceptedAt: true, createdAt: true } as const;

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  private async member(db: Tx, workspaceId: string, userId: string) {
    const member = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
    if (!member) throw new NotFoundException('Không tìm thấy không gian làm việc.');
    return member;
  }

  private async lock(db: Tx, workspaceId: string) {
    // Use the workspace row as the single lock for all member/invitation writes.
    // A concurrent demotion/removal cannot race a previously authorized mutation.
    const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Không tìm thấy không gian làm việc.');
  }

  private async record(db: Tx, workspaceId: string, actorId: string, action: string, entityId: string, details: Prisma.InputJsonObject) {
    await db.auditLog.create({ data: { workspaceId, actorId, action, entityId, details } });
    await db.outboxEvent.create({ data: { workspaceId, eventType: action, payload: { actorId, entityId, ...details } } });
  }

  async list(user: AuthUser) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId: user.id }, include: { workspace: true }, orderBy: { workspace: { createdAt: 'asc' } },
    });
    return memberships.map(member => ({ ...member.workspace, role: member.role }));
  }

  async create(user: AuthUser, input: { name: string; slug: string; description?: string }) {
    try {
      return await this.prisma.$transaction(async db => {
        const workspace = await db.workspace.create({ data: {
          name: input.name, slug: input.slug, description: input.description ?? '',
          members: { create: { userId: user.id, role: 'OWNER' } },
        } });
        await this.record(db, workspace.id, user.id, 'workspace.created', workspace.id, { name: workspace.name });
        return { ...workspace, role: 'OWNER' as const };
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Đường dẫn không gian làm việc đã được sử dụng.');
      }
      throw error;
    }
  }

  async get(user: AuthUser, workspaceId: string) {
    return this.prisma.$transaction(async db => {
      const membership = await this.member(db, workspaceId, user.id);
      const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
      return { ...workspace, role: membership.role };
    });
  }

  async update(user: AuthUser, workspaceId: string, input: { name: string; description: string; version: number }) {
    return this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireWorkspaceAdmin(actor.role);
      const updated = await db.workspace.updateMany({
        where: { id: workspaceId, version: input.version },
        data: { name: input.name, description: input.description, version: { increment: 1 } },
      });
      if (!updated.count) throw new ConflictException('Không gian đã thay đổi. Hãy tải lại dữ liệu rồi thử lại.');
      await this.record(db, workspaceId, user.id, 'workspace.updated', workspaceId, { name: input.name, version: input.version + 1 });
      return { ...await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } }), role: actor.role };
    });
  }

  async members(user: AuthUser, workspaceId: string) {
    return this.prisma.$transaction(async db => {
      await this.member(db, workspaceId, user.id);
      return db.workspaceMember.findMany({
        where: { workspaceId }, select: { id: true, userId: true, role: true, user: { select: userFields } }, orderBy: { userId: 'asc' },
      });
    });
  }

  async invitations(user: AuthUser, workspaceId: string) {
    return this.prisma.$transaction(async db => {
      const actor = await this.member(db, workspaceId, user.id);
      requireWorkspaceAdmin(actor.role);
      return db.invitation.findMany({
        where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
        select: invitationFields, orderBy: { createdAt: 'desc' },
      });
    });
  }

  async invite(user: AuthUser, workspaceId: string, input: { email: string; role: WorkspaceRole }) {
    const { invitation, inviteToken, workspaceName } = await this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireAssignableRole(actor.role, input.role);
      const existingMember = await db.workspaceMember.findFirst({ where: { workspaceId, user: { email: input.email } } });
      if (existingMember) throw new ConflictException('Người dùng đã là thành viên của không gian.');
      const existingInvite = await db.invitation.findFirst({
        where: { workspaceId, email: input.email, acceptedAt: null, expiresAt: { gt: new Date() } },
      });
      if (existingInvite) throw new ConflictException('Email này đã có lời mời đang chờ. Hãy thu hồi trước khi tạo lại.');
      const inviteToken = randomBytes(32).toString('hex');
      const invitation = await db.invitation.create({
        data: {
          workspaceId, email: input.email, role: input.role,
          tokenHash: createHash('sha256').update(inviteToken).digest('hex'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), invitedById: user.id,
        }, select: invitationFields,
      });
      // The secret is deliberately absent from both audit and outbox.
      await this.record(db, workspaceId, user.id, 'invitation.created', invitation.id, { email: input.email, role: input.role });
      const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { name: true } });
      return { invitation, inviteToken, workspaceName: workspace.name };
    });
    // Sent after commit so the workspace lock is never held across a network call,
    // and from memory so the token stays out of the database, audit and outbox.
    const emailDelivery = await this.mail.sendInvitation({
      to: input.email, token: inviteToken, workspaceName, inviterName: user.displayName, roleName: roleLabels[input.role], expiresAt: invitation.expiresAt,
    });
    if (emailDelivery !== 'DISABLED') {
      await this.prisma.$transaction(db => this.record(db, workspaceId, user.id, emailDelivery === 'SENT' ? 'invitation.email_sent' : 'invitation.email_failed', invitation.id, { email: input.email }));
    }
    return { ...invitation, inviteToken, emailDelivery };
  }

  async accept(user: AuthUser, token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const candidate = await this.prisma.invitation.findUnique({ where: { tokenHash }, select: { workspaceId: true } });
    if (!candidate) throw new NotFoundException('Lời mời không hợp lệ hoặc không còn hiệu lực.');
    return this.prisma.$transaction(async db => {
      await this.lock(db, candidate.workspaceId);
      const invitation = await db.invitation.findUnique({ where: { tokenHash } });
      if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
        throw new NotFoundException('Lời mời không hợp lệ hoặc không còn hiệu lực.');
      }
      if (invitation.email !== user.email.toLowerCase()) throw new ForbiddenException('Hãy đăng nhập bằng email nhận lời mời.');
      const issuer = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: invitation.invitedById } } });
      if (!issuer) throw new ForbiddenException('Người mời không còn quyền quản lý không gian.');
      requireAssignableRole(issuer.role, invitation.role);
      const existing = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } } });
      if (existing) throw new ConflictException('Bạn đã là thành viên của không gian.');
      const claimed = await db.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() },
      });
      if (!claimed.count) throw new ConflictException('Lời mời vừa được sử dụng hoặc hết hạn.');
      const membership = await db.workspaceMember.create({ data: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role } });
      await this.record(db, invitation.workspaceId, user.id, 'invitation.accepted', invitation.id, { memberId: membership.id, role: membership.role });
      return { ...await db.workspace.findUniqueOrThrow({ where: { id: invitation.workspaceId } }), role: membership.role };
    });
  }

  async changeRole(user: AuthUser, workspaceId: string, memberId: string, role: WorkspaceRole) {
    return this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireWorkspaceAdmin(actor.role);
      const target = await db.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
      if (!target) throw new NotFoundException('Không tìm thấy thành viên.');
      requireManageableMember(actor, target);
      requireAssignableRole(actor.role, role);
      const updated = await db.workspaceMember.updateMany({ where: { id: target.id, workspaceId, version: target.version }, data: { role, version: { increment: 1 } } });
      if (!updated.count) throw new ConflictException('Quyền thành viên vừa thay đổi. Hãy tải lại dữ liệu.');
      const member = await db.workspaceMember.findUniqueOrThrow({ where: { id: target.id }, select: { id: true, userId: true, role: true, user: { select: userFields } } });
      await this.record(db, workspaceId, user.id, 'member.role_changed', target.id, { from: target.role, to: role });
      return member;
    });
  }

  async remove(user: AuthUser, workspaceId: string, memberId: string) {
    return this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireWorkspaceAdmin(actor.role);
      const target = await db.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
      if (!target) throw new NotFoundException('Không tìm thấy thành viên.');
      requireManageableMember(actor, target);
      const removed = await db.workspaceMember.deleteMany({ where: { id: target.id, workspaceId, version: target.version } });
      if (!removed.count) throw new ConflictException('Thành viên vừa thay đổi. Hãy tải lại dữ liệu.');
      // Work must not stay assigned to someone who can no longer open this workspace.
      const unassigned = await db.task.updateMany({ where: { workspaceId, assigneeId: target.userId, deletedAt: null }, data: { assigneeId: null, version: { increment: 1 } } });
      await db.project.updateMany({ where: { workspaceId, ownerId: target.userId }, data: { ownerId: null, version: { increment: 1 } } });
      await this.record(db, workspaceId, user.id, 'member.removed', target.id, { userId: target.userId, role: target.role, unassignedTasks: unassigned.count });
      return { success: true };
    });
  }

  async revoke(user: AuthUser, workspaceId: string, invitationId: string) {
    return this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireWorkspaceAdmin(actor.role);
      const invitation = await db.invitation.findFirst({ where: { id: invitationId, workspaceId, acceptedAt: null } });
      if (!invitation) throw new NotFoundException('Không tìm thấy lời mời đang chờ.');
      requireAssignableRole(actor.role, invitation.role);
      await db.invitation.delete({ where: { id: invitation.id } });
      await this.record(db, workspaceId, user.id, 'invitation.revoked', invitation.id, { email: invitation.email });
      return { success: true };
    });
  }

  async audit(user: AuthUser, workspaceId: string) {
    return this.prisma.$transaction(async db => {
      const actor = await this.member(db, workspaceId, user.id);
      requireWorkspaceAdmin(actor.role);
      return db.auditLog.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 100 });
    });
  }
}
