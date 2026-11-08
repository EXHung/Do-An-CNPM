'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Check, Copy, Plus } from 'lucide-react';
import { api, ApiError, EmailDelivery, Invitation, Member, message, Role } from '../lib/api';
import { formatDay, roleNames, roleRank } from '../lib/format';
import { useWorkspace } from './context';
import { Avatar, Confirmation, ConfirmDialog, Modal, Notice, RoleTag } from './ui';

export function MembersPage() {
  const { workspace, user, members, reloadMembers, reloadWorkspaces, report, fail, touchData } = useWorkspace();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviting, setInviting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [pending, setPending] = useState(false);
  const manage = workspace.role === 'OWNER' || workspace.role === 'ADMIN';
  const base = `/workspaces/${workspace.id}`;
  const availableRoles: Role[] = workspace.role === 'OWNER' ? ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] : ['MANAGER', 'MEMBER', 'VIEWER'];
  const loadInvites = useCallback(() => manage ? api<Invitation[]>(`${base}/invitations`).then(setInvitations) : Promise.resolve(), [base, manage]);
  useEffect(() => { loadInvites().catch(fail); }, [loadInvites, fail]);
  async function mutation(action: () => Promise<unknown>, success: string) {
    setPending(true); report({});
    try { await action(); await Promise.all([reloadMembers(), loadInvites()]); touchData(); report({ notice: success }); }
    catch (err) {
      fail(err);
      if (err instanceof ApiError && [403, 404, 409].includes(err.status)) await reloadWorkspaces().catch(() => {});
    } finally { setPending(false); }
  }
  const canManageMember = (member: Member) => manage && member.userId !== user.id && member.role !== 'OWNER' && (workspace.role === 'OWNER' || member.role !== 'ADMIN');
  const canRevoke = (invitation: Invitation) => workspace.role === 'OWNER' || invitation.role !== 'ADMIN';
  const ordered = [...members].sort((a, b) => roleRank[a.role] - roleRank[b.role] || a.user.displayName.localeCompare(b.user.displayName, 'vi'));
  return <div className="page">
    <header className="page-head"><div><h1>Thành viên</h1><p>{members.length} người trong {workspace.name}.</p></div>{manage && <button type="button" className="btn-primary" onClick={() => setInviting(true)}><Plus size={16} aria-hidden="true" />Mời thành viên</button>}</header>
    <ul className="rows member-rows">{ordered.map(member => <li key={member.id}>
      <div className="row-person-main"><Avatar name={member.user.displayName} /><div><strong>{member.user.displayName}{member.userId === user.id ? ' (bạn)' : ''}</strong><small>{member.user.email}</small></div></div>
      {canManageMember(member) ? <>
        <select aria-label={`Vai trò của ${member.user.email}`} value={member.role} disabled={pending} onChange={e => void mutation(() => api(`${base}/members/${member.id}`, 'PATCH', { role: e.target.value }), 'Đã cập nhật vai trò.')}>{availableRoles.map(r => <option key={r} value={r}>{roleNames[r]}</option>)}</select>
        <button type="button" className="btn-text danger" disabled={pending} aria-label={`Xóa ${member.user.displayName}`} onClick={() => setConfirmation({ title: 'Xóa thành viên?', body: `${member.user.displayName} sẽ mất quyền vào không gian ngay lập tức. Các nhiệm vụ đang giao cho người này sẽ chuyển về chưa giao.`, label: 'Xóa thành viên', run: () => void mutation(() => api(`${base}/members/${member.id}`, 'DELETE'), 'Đã xóa thành viên khỏi không gian.') })}>Xóa</button>
      </> : <RoleTag role={member.role} />}
    </li>)}</ul>
    {invitations.length > 0 && <section className="section" aria-labelledby="pending-title"><h2 id="pending-title">Lời mời đang chờ</h2><ul className="rows">{invitations.map(inv => <li key={inv.id}><div className="row-main static"><strong>{inv.email}</strong><small>{roleNames[inv.role]}, hết hạn {formatDay(inv.expiresAt)}</small></div>{canRevoke(inv) && <button type="button" className="btn-text" disabled={pending} aria-label={`Thu hồi lời mời của ${inv.email}`} onClick={() => setConfirmation({ title: 'Thu hồi lời mời?', body: `Mã mời đã gửi cho ${inv.email} sẽ không dùng được nữa.`, label: 'Thu hồi', run: () => void mutation(() => api(`${base}/invitations/${inv.id}`, 'DELETE'), 'Đã thu hồi lời mời.') })}>Thu hồi</button>}</li>)}</ul></section>}
    {inviting && <InviteDialog roles={availableRoles} onClose={() => setInviting(false)} onCreated={() => void loadInvites()} />}
    {confirmation && <ConfirmDialog {...confirmation} onClose={() => setConfirmation(null)} />}
  </div>;
}

function InviteDialog({ roles, onClose, onCreated }: { roles: Role[]; onClose: () => void; onCreated: () => void }) {
  const { workspace, fail } = useWorkspace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [result, setResult] = useState<{ token: string; delivery: EmailDelivery; email: string } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try {
      const created = await api<{ inviteToken: string; emailDelivery: EmailDelivery }>(`/workspaces/${workspace.id}/invitations`, 'POST', { email, role });
      setResult({ token: created.inviteToken, delivery: created.emailDelivery, email }); setEmail(''); setCopied(false); onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) fail(err); else setError(message(err));
    } finally { setPending(false); }
  }
  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.token); setCopied(true); }
    catch { setError('Không thể sao chép tự động. Hãy chọn và sao chép mã.'); }
  }
  return <Modal title="Mời thành viên" onClose={onClose}>
    {result ? <>
      {result.delivery === 'SENT' ? <Notice success={`Đã gửi email mời đến ${result.email}.`} />
        : result.delivery === 'FAILED' ? <Notice error={`Chưa gửi được email đến ${result.email}. Hãy gửi mã bên dưới trực tiếp.`} />
        : <p>Máy chủ chưa bật gửi email. Hãy gửi mã bên dưới cho {result.email}.</p>}
      <label className="spaced">Mã mời vừa tạo<input readOnly value={result.token} onFocus={e => e.target.select()} /></label>
      <small className="field-hint">Mã chỉ hiện một lần và có hiệu lực 7 ngày.</small>
      <Notice error={error} />
      <div className="modal-actions"><button type="button" className="btn-secondary" onClick={copy}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied ? 'Đã sao chép' : 'Sao chép mã'}</button><button type="button" className="btn-secondary" onClick={() => setResult(null)}>Mời thêm người</button><button type="button" className="btn-primary" onClick={onClose}>Xong</button></div>
    </> : <form onSubmit={submit}>
      <label>Email thành viên<input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} /></label>
      <label>Vai trò<select value={role} onChange={e => setRole(e.target.value as Role)}>{roles.map(r => <option key={r} value={r}>{roleNames[r]}</option>)}</select></label>
      <Notice error={error} />
      <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Hủy</button><button className="btn-primary" disabled={pending}>{pending ? 'Đang tạo…' : 'Tạo lời mời'}</button></div>
    </form>}
  </Modal>;
}
