import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { uniqueProjectKey } from './project-key';
import { requireProjectWrite, requireTaskWrite } from './projects.policy';

type Tx = Prisma.TransactionClient;
type ProjectInput = { name: string; description?: string; ownerId?: string | null; status?: ProjectStatus; startAt?: Date | null; targetAt?: Date | null };
type TaskInput = { title: string; description?: string; assigneeId?: string | null; dueAt?: Date | null };

const userFields = { id: true, email: true, displayName: true } as const;
const liveTask = { deletedAt: null } as const;
const projectSelect = {
  id: true, workspaceId: true, key: true, name: true, description: true, status: true, startAt: true, targetAt: true, version: true, createdAt: true, updatedAt: true,
  owner: { select: userFields }, _count: { select: { tasks: { where: liveTask } } },
} as const;
const taskSelect = {
  id: true, workspaceId: true, projectId: true, humanReadableKey: true, title: true, description: true, dueAt: true, version: true, createdAt: true, updatedAt: true,
  assignee: { select: userFields }, createdBy: { select: userFields }, status: { select: { name: true, type: true } }, project: { select: { id: true, key: true, name: true } },
} as const;
const closedStatuses: ProjectStatus[] = ['COMPLETED', 'CANCELLED'];
const defaultStatuses = [
  { name: 'Cần làm', type: 'TODO', position: 1024, color: '#5f5c72' },
  { name: 'Đang làm', type: 'IN_PROGRESS', position: 2048, color: '#5b3fd0' },
  { name: 'Hoàn thành', type: 'DONE', position: 3072, color: '#1f7a4d' },
] as const;

type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;
function publicProject({ _count, ...project }: ProjectRow) { return { ...project, taskCount: _count.tasks }; }

@Injectable()
export class ProjectsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async member(db: Tx, workspaceId: string, userId: string) {
    const member = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
    if (!member) throw new NotFoundException('Không tìm thấy không gian làm việc.');
    return member;
  }

  private async lock(db: Tx, workspaceId: string) {
    const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Không tìm thấy không gian làm việc.');
  }

  private async record(db: Tx, workspaceId: string, actorId: string, action: string, entityId: string, details: Prisma.InputJsonObject) {
    await db.auditLog.create({ data: { workspaceId, actorId, action, entityId, details } });
    await db.outboxEvent.create({ data: { workspaceId, eventType: action, payload: { actorId, entityId, ...details } } });
  }

  private async requireMember(db: Tx, workspaceId: string, userId: string | null | undefined, message: string) {
    if (!userId) return;
    const found = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
    if (!found) throw new BadRequestException(message);
  }

  private requireDateOrder(startAt: Date | null | undefined, targetAt: Date | null | undefined) {
    if (startAt && targetAt && startAt > targetAt) throw new BadRequestException('Ngày kết thúc phải sau hoặc trùng ngày bắt đầu.');
  }

  private async loadProject(db: Tx, workspaceId: string, projectId: string) {
    const project = await db.project.findFirst({ where: { id: projectId, workspaceId }, select: projectSelect });
    if (!project) throw new NotFoundException('Không tìm thấy dự án.');
    return project;
  }

  private async loadTask(db: Tx, workspaceId: string, taskId: string) {
    const task = await db.task.findFirst({ where: { id: taskId, workspaceId, ...liveTask }, select: taskSelect });
    if (!task) throw new NotFoundException('Không tìm thấy nhiệm vụ.');
    return task;
  }

  /** Created on first use under the workspace lock, so concurrent tasks cannot create duplicates. */
  private async todoStatus(db: Tx, workspaceId: string) {
    const found = await db.workflowStatus.findFirst({ where: { workspaceId, type: 'TODO' }, orderBy: { position: 'asc' } });
    if (found) return found.id;
    await db.workflowStatus.createMany({ data: defaultStatuses.map(status => ({ ...status, workspaceId })) });
    return (await db.workflowStatus.findFirstOrThrow({ where: { workspaceId, type: 'TODO' } })).id;
  }

  async listProjects(user: AuthUser, workspaceId: string) {
    return this.prisma.$transaction(async db => {
      await this.member(db, workspaceId, user.id);
      const projects = await db.project.findMany({ where: { workspaceId }, select: projectSelect, orderBy: { createdAt: 'desc' } });
      return projects.map(publicProject);
    });
  }

  async getProject(user: AuthUser, workspaceId: string, projectId: string) {
    return this.prisma.$transaction(async db => {
      await this.member(db, workspaceId, user.id);
      return publicProject(await this.loadProject(db, workspaceId, projectId));
    });
  }

  async createProject(user: AuthUser, workspaceId: string, input: ProjectInput) {
    return this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireProjectWrite(actor.role);
      const ownerId = input.ownerId === undefined ? user.id : input.ownerId;
      await this.requireMember(db, workspaceId, ownerId, 'Người phụ trách phải là thành viên của không gian.');
      this.requireDateOrder(input.startAt, input.targetAt);
      const existing = await db.project.findMany({ where: { workspaceId }, select: { key: true } });
      const key = uniqueProjectKey(input.name, new Set(existing.map(project => project.key)));
      const project = await db.project.create({
        data: { workspaceId, key, name: input.name, description: input.description ?? '', ownerId, status: input.status ?? 'PLANNED', startAt: input.startAt ?? null, targetAt: input.targetAt ?? null },
        select: projectSelect,
      });
      await this.record(db, workspaceId, user.id, 'project.created', project.id, { name: project.name, key });
      return publicProject(project);
    });
  }

  async updateProject(user: AuthUser, workspaceId: string, projectId: string, input: Partial<ProjectInput> & { version: number }) {
    return this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireProjectWrite(actor.role);
      const current = await this.loadProject(db, workspaceId, projectId);
      await this.requireMember(db, workspaceId, input.ownerId, 'Người phụ trách phải là thành viên của không gian.');
      this.requireDateOrder(input.startAt === undefined ? current.startAt : input.startAt, input.targetAt === undefined ? current.targetAt : input.targetAt);
      const { version, ...data } = input;
      const updated = await db.project.updateMany({ where: { id: projectId, workspaceId, version }, data: { ...data, version: { increment: 1 } } });
      if (!updated.count) throw new ConflictException('Dự án đã thay đổi. Hãy tải lại dữ liệu rồi thử lại.');
      await this.record(db, workspaceId, user.id, 'project.updated', projectId, { name: input.name ?? current.name, version: version + 1 });
      return publicProject(await this.loadProject(db, workspaceId, projectId));
    });
  }

  async listTasks(user: AuthUser, workspaceId: string, projectId: string) {
    return this.prisma.$transaction(async db => {
      await this.member(db, workspaceId, user.id);
      await this.loadProject(db, workspaceId, projectId);
      return db.task.findMany({ where: { workspaceId, projectId, ...liveTask }, select: taskSelect, orderBy: { position: 'asc' } });
    });
  }

  async myTasks(user: AuthUser, workspaceId: string) {
    return this.prisma.$transaction(async db => {
      await this.member(db, workspaceId, user.id);
      return db.task.findMany({
        where: { workspaceId, assigneeId: user.id, ...liveTask, status: { type: { notIn: ['DONE', 'CANCELLED'] } }, project: { status: { notIn: closedStatuses } } },
        select: taskSelect, orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }], take: 200,
      });
    });
  }

  async getTask(user: AuthUser, workspaceId: string, taskId: string) {
    return this.prisma.$transaction(async db => {
      await this.member(db, workspaceId, user.id);
      return this.loadTask(db, workspaceId, taskId);
    });
  }

  async createTask(user: AuthUser, workspaceId: string, projectId: string, input: TaskInput) {
    return this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireTaskWrite(actor.role);
      const project = await this.loadProject(db, workspaceId, projectId);
      if (closedStatuses.includes(project.status)) throw new ConflictException('Dự án đã đóng nên không thể thêm nhiệm vụ.');
      await this.requireMember(db, workspaceId, input.assigneeId, 'Người thực hiện phải là thành viên của không gian.');
      const statusId = await this.todoStatus(db, workspaceId);
      const { taskCounter } = await db.project.update({ where: { id: projectId }, data: { taskCounter: { increment: 1 } }, select: { taskCounter: true } });
      const last = await db.task.aggregate({ where: { projectId }, _max: { position: true } });
      const task = await db.task.create({
        data: {
          workspaceId, projectId, statusId, humanReadableKey: `${project.key}-${taskCounter}`, title: input.title, description: input.description ?? null,
          assigneeId: input.assigneeId ?? null, dueAt: input.dueAt ?? null, position: (last._max.position ?? 0) + 1024, createdById: user.id,
        },
        select: taskSelect,
      });
      await this.record(db, workspaceId, user.id, 'task.created', task.id, { key: task.humanReadableKey, title: task.title });
      return task;
    });
  }

  async updateTask(user: AuthUser, workspaceId: string, taskId: string, input: Partial<TaskInput> & { version: number }) {
    return this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireTaskWrite(actor.role);
      const current = await this.loadTask(db, workspaceId, taskId);
      await this.requireMember(db, workspaceId, input.assigneeId, 'Người thực hiện phải là thành viên của không gian.');
      const { version, ...data } = input;
      const updated = await db.task.updateMany({ where: { id: taskId, workspaceId, version, ...liveTask }, data: { ...data, version: { increment: 1 } } });
      if (!updated.count) throw new ConflictException('Nhiệm vụ đã thay đổi. Hãy tải lại dữ liệu rồi thử lại.');
      const task = await this.loadTask(db, workspaceId, taskId);
      const details: Prisma.InputJsonObject = { key: task.humanReadableKey, title: task.title };
      if (input.assigneeId !== undefined && input.assigneeId !== current.assignee?.id) {
        await this.record(db, workspaceId, user.id, 'task.assigned', taskId, { ...details, assignee: task.assignee?.displayName ?? null });
      } else {
        await this.record(db, workspaceId, user.id, 'task.updated', taskId, details);
      }
      return task;
    });
  }

  async deleteTask(user: AuthUser, workspaceId: string, taskId: string, version: number) {
    return this.prisma.$transaction(async db => {
      await this.lock(db, workspaceId);
      const actor = await this.member(db, workspaceId, user.id);
      requireTaskWrite(actor.role);
      const task = await this.loadTask(db, workspaceId, taskId);
      const deleted = await db.task.updateMany({ where: { id: taskId, workspaceId, version, ...liveTask }, data: { deletedAt: new Date(), version: { increment: 1 } } });
      if (!deleted.count) throw new ConflictException('Nhiệm vụ đã thay đổi. Hãy tải lại dữ liệu rồi thử lại.');
      await this.record(db, workspaceId, user.id, 'task.deleted', taskId, { key: task.humanReadableKey, title: task.title });
      return { success: true };
    });
  }
}
