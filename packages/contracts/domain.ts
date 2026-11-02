export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';
export type Permission = 'read' | 'task.write' | 'project.write' | 'member.manage' | 'audit.read';
const grants: Record<Role, readonly Permission[]> = {
  OWNER: ['read', 'task.write', 'project.write', 'member.manage', 'audit.read'],
  ADMIN: ['read', 'task.write', 'project.write', 'member.manage', 'audit.read'],
  MANAGER: ['read', 'task.write', 'project.write'],
  MEMBER: ['read', 'task.write'],
  VIEWER: ['read'],
};
export function can(role: Role, permission: Permission): boolean {
  return grants[role]?.includes(permission) ?? false;
}
export interface ProgressTask {
  id: string;
  parentTaskId: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  estimateMinutes: number | null;
}
export function calculateProgress(tasks: readonly ProgressTask[]): number {
  const parents = new Set(tasks.map(task => task.parentTaskId).filter(Boolean));
  const leaves = tasks.filter(task => !parents.has(task.id) && task.status !== 'CANCELLED');
  if (!leaves.length) return 0;
  const weighted = leaves.every(task => task.estimateMinutes !== null && task.estimateMinutes > 0);
  const weight = (task: ProgressTask) => weighted ? task.estimateMinutes! : 1;
  const total = leaves.reduce((sum, task) => sum + weight(task), 0);
  return Math.round(leaves.filter(task => task.status === 'DONE').reduce((sum, task) => sum + weight(task), 0) / total * 100);
}
export function rankBetween(before: number | null, after: number | null): number {
  if (before !== null && !Number.isFinite(before) || after !== null && !Number.isFinite(after)) throw new Error('Invalid rank');
  if (before !== null && after !== null && before >= after) throw new Error('Invalid neighbors');
  const rank = before === null ? (after === null ? 1024 : after - 1024) : after === null ? before + 1024 : before + (after - before) / 2;
  if (!Number.isFinite(rank) || rank === before || rank === after) throw new Error('Rebalance required');
  return rank;
}
