import type { Role } from './api';

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
