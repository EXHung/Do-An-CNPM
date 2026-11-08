import type { ProjectStatus, Role } from './api';

export const roleNames: Record<Role, string> = { OWNER: 'Chủ sở hữu', ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', MEMBER: 'Thành viên', VIEWER: 'Người xem' };
export const roleRank: Record<Role, number> = { OWNER: 0, ADMIN: 1, MANAGER: 2, MEMBER: 3, VIEWER: 4 };

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const picked = words.length > 1 ? words.slice(-2) : words;
  return (picked.length > 1 ? picked.map(word => Array.from(word)[0]).join('') : Array.from(picked[0] ?? '?').slice(0, 2).join('')).toUpperCase();
}
export function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
}

export const projectStatusNames: Record<ProjectStatus, string> = { PLANNED: 'Sắp làm', ACTIVE: 'Đang làm', COMPLETED: 'Đã xong', CANCELLED: 'Đã hủy' };
export const canWriteProjects = (role: Role) => role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
export const canWriteTasks = (role: Role) => role !== 'VIEWER';
export const canManageMembers = (role: Role) => role === 'OWNER' || role === 'ADMIN';

/** Calendar days travel as YYYY-MM-DD, so they never shift with the viewer's time zone. */
export const dayKey = (iso: string | null | undefined) => iso?.slice(0, 10) ?? '';
export const todayKey = () => new Date().toLocaleDateString('en-CA');
export function formatDay(iso: string | null | undefined) {
  const [year, month, day] = dayKey(iso).split('-');
  return day ? `${day}/${month}/${year}` : '';
}
export function firstName(name: string) { return name.trim().split(/\s+/).at(-1) ?? name; }

export type DueGroup = 'overdue' | 'today' | 'week' | 'later' | 'none';
export const dueGroupNames: Record<DueGroup, string> = { overdue: 'Quá hạn', today: 'Hôm nay', week: '7 ngày tới', later: 'Sau đó', none: 'Chưa đặt hạn' };
export function dueGroup(iso: string | null, today = todayKey()): DueGroup {
  const due = dayKey(iso);
  if (!due) return 'none';
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  const days = (Date.parse(due) - Date.parse(today)) / 86400000;
  return days <= 7 ? 'week' : 'later';
}
