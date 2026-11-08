import { ForbiddenException } from '@nestjs/common';
import type { WorkspaceRole } from '@prisma/client';

/** Mirrors the grants in packages/contracts/domain.ts; the unit test keeps both in step. */
export const PROJECT_WRITERS: readonly WorkspaceRole[] = ['OWNER', 'ADMIN', 'MANAGER'];
export const TASK_WRITERS: readonly WorkspaceRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'];

export function requireProjectWrite(role: WorkspaceRole): void {
  if (!PROJECT_WRITERS.includes(role)) throw new ForbiddenException('Chỉ chủ sở hữu, quản trị viên và quản lý mới được sửa dự án.');
}

export function requireTaskWrite(role: WorkspaceRole): void {
  if (!TASK_WRITERS.includes(role)) throw new ForbiddenException('Người xem không thể thay đổi nhiệm vụ.');
}
