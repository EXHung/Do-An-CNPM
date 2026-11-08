'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, ApiError, AuditEvent, Member, Role } from '../lib/api';
import { roleNames } from '../lib/format';

const COLLAPSED_ROWS = 8;

function text(value: unknown) { return typeof value === 'string' ? value : ''; }
function role(value: unknown) { return roleNames[value as Role] ?? text(value); }

function describe(event: AuditEvent, members: Member[]) {
  const details = event.details ?? {};
  const target = members.find(member => member.id === event.entityId)?.user.displayName ?? 'một thành viên';
  switch (event.action) {
    case 'workspace.created': return 'đã tạo không gian';
    case 'workspace.updated': return 'đã sửa thông tin không gian';
    case 'invitation.created': return `đã mời ${text(details.email)} làm ${role(details.role)}`;
    case 'invitation.email_sent': return `đã gửi email mời đến ${text(details.email)}`;
    case 'invitation.email_failed': return `không gửi được email mời đến ${text(details.email)}`;
    case 'invitation.accepted': return `đã tham gia với vai trò ${role(details.role)}`;
    case 'invitation.revoked': return `đã thu hồi lời mời của ${text(details.email)}`;
    case 'member.role_changed': return `đã đổi vai trò của ${target} từ ${role(details.from)} sang ${role(details.to)}`;
    case 'member.removed': return `đã xóa một ${role(details.role)} khỏi nhóm`;
    case 'project.created': return `đã tạo dự án ${text(details.name)}`;
    case 'project.updated': return `đã sửa dự án ${text(details.name)}`;
    case 'task.created': return `đã tạo nhiệm vụ ${text(details.key)}: ${text(details.title)}`;
    case 'task.updated': return `đã sửa nhiệm vụ ${text(details.key)}: ${text(details.title)}`;
    case 'task.assigned': return details.assignee ? `đã giao ${text(details.key)} cho ${text(details.assignee)}` : `đã bỏ người thực hiện của ${text(details.key)}`;
    case 'task.deleted': return `đã xóa nhiệm vụ ${text(details.key)}: ${text(details.title)}`;
    default: return `đã thực hiện ${event.action}`;
  }
}

export function AuditPanel({ workspaceId, members, refreshKey, fail }: { workspaceId: string; members: Member[]; refreshKey: number; fail: (err: unknown) => void }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const load = useCallback(async () => {
    setLoadError('');
    try { setEvents(await api<AuditEvent[]>(`/workspaces/${workspaceId}/audit`)); }
    catch (err) {
      if (err instanceof ApiError && err.status === 401) fail(err);
      else setLoadError('Chưa tải được nhật ký hoạt động.');
    } finally { setLoading(false); }
  }, [workspaceId, fail]);
  useEffect(() => { void load(); }, [load, refreshKey]);
  const actorName = (id: string) => members.find(member => member.userId === id)?.user.displayName ?? 'Người đã rời nhóm';
  const visible = expanded ? events : events.slice(0, COLLAPSED_ROWS);
  return <section className="section audit-panel"><div className="section-head"><div><h2>Nhật ký hoạt động</h2><p>100 thay đổi gần nhất. Chỉ chủ sở hữu và quản trị viên xem được.</p></div></div>
    {loading ? <div className="skeleton-rows" role="status" aria-label="Đang tải nhật ký hoạt động"><i /><i /></div>
      : loadError ? <><p className="field-error" role="alert">{loadError}</p><button type="button" className="btn-secondary" onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" />Thử lại</button></>
      : events.length === 0 ? <p>Chưa có thay đổi nào.</p>
      : <><ol className="audit-list">{visible.map(event => <li key={event.id}><span><strong>{actorName(event.actorId)}</strong> {describe(event, members)}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</time></li>)}</ol>
        {events.length > COLLAPSED_ROWS && <button type="button" className="btn-text" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Thu gọn' : `Xem tất cả ${events.length} thay đổi`}</button>}</>}
  </section>;
}
