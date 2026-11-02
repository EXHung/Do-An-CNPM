import { ForbiddenException } from '@nestjs/common';
import type { WorkspaceRole } from '@prisma/client';

/** The owner is immutable during SP1. Ownership transfer is a separate use case. */
export function requireWorkspaceAdmin(role: WorkspaceRole): void {
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new ForbiddenException('Bạn không có quyền quản lý không gian làm việc.');
  }
}

export function requireAssignableRole(actorRole: WorkspaceRole, nextRole: WorkspaceRole): void {
  requireWorkspaceAdmin(actorRole);
  if (nextRole === 'OWNER' || (actorRole === 'ADMIN' && nextRole === 'ADMIN')) {
    throw new ForbiddenException('Bạn không thể cấp vai trò này.');
  }
}

export function requireManageableMember(
  actor: { userId: string; role: WorkspaceRole },
  target: { userId: string; role: WorkspaceRole },
): void {
  requireWorkspaceAdmin(actor.role);
  if (actor.userId === target.userId) {
    throw new ForbiddenException('Không thể tự thay đổi quyền hoặc xóa chính mình.');
  }
  if (target.role === 'OWNER' || (actor.role === 'ADMIN' && target.role === 'ADMIN')) {
    throw new ForbiddenException('Bạn không thể quản lý thành viên có vai trò này.');
  }
}
