'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Check, Copy, Plus, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { api, ApiError, EmailDelivery, Invitation, Member, Role, User, Workspace } from '../lib/api';
import { initials, roleNames, roleRank } from '../lib/format';
import { AuditPanel } from './AuditPanel';
import { Confirmation, ConfirmDialog, Report, RoleTag } from './ui';

export function WorkspaceDetail({ workspace, user, onChanged, report, fail }: { workspace: Workspace; user: User; onChanged: () => Promise<void>; report: Report; fail: (err: unknown) => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [inviteToken, setInviteToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [auditKey, setAuditKey] = useState(0);
  const manage = workspace.role === 'OWNER' || workspace.role === 'ADMIN';
  const availableRoles: Role[] = workspace.role === 'OWNER' ? ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] : ['MANAGER', 'MEMBER', 'VIEWER'];
  const dirty = name.trim() !== workspace.name || description.trim() !== workspace.description;
  const reload = useCallback(async () => {
    const [people, invites] = await Promise.all([api<Member[]>(`/workspaces/${workspace.id}/members`), manage ? api<Invitation[]>(`/workspaces/${workspace.id}/invitations`) : Promise.resolve([])]);
    setMembers(people); setInvitations(invites); setLoadFailed(false);
  }, [workspace.id, manage]);
  const load = useCallback(() => { setLoading(true); return reload().catch(err => { setLoadFailed(true); fail(err); }).finally(() => setLoading(false)); }, [reload, fail]);
  useEffect(() => { void load(); }, [load]);
  // A newer version from the server replaces the form, so a stale draft cannot be re-saved over it.
  useEffect(() => { setName(workspace.name); setDescription(workspace.description); }, [workspace.version, workspace.name, workspace.description]);
  async function mutation(action: () => Promise<unknown>, success: string | (() => { error?: string; notice?: string })) {
    setPending(true); report({});
    try { await action(); await onChanged(); await reload(); setAuditKey(key => key + 1); report(typeof success === 'string' ? { notice: success } : success()); }
    catch (err) {
      fail(err);
      // The action was refused because local data is stale: refresh it, keeping the error on screen.
      if (err instanceof ApiError && [403, 404, 409].includes(err.status)) await onChanged().catch(() => {});
    } finally { setPending(false); }
  }
  async function invite(event: FormEvent) {
    event.preventDefault(); setInviteToken(''); setCopied(false);
    const invited = email;
    let delivery: EmailDelivery = 'DISABLED';
    await mutation(async () => {
      const created = await api<{ inviteToken: string; emailDelivery: EmailDelivery }>(`/workspaces/${workspace.id}/invitations`, 'POST', { email, role });
      setInviteToken(created.inviteToken); setEmail(''); delivery = created.emailDelivery;
    }, () => delivery === 'SENT' ? { notice: `Đã gửi email mời đến ${invited}.` }
      : delivery === 'FAILED' ? { error: `Đã tạo lời mời nhưng chưa gửi được email đến ${invited}. Hãy sao chép mã bên dưới và gửi trực tiếp.` }
      : { notice: 'Đã tạo lời mời. Hãy sao chép mã và gửi cho thành viên.' });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await mutation(() => api(`/workspaces/${workspace.id}`, 'PATCH', { name, description, version: workspace.version }), 'Đã cập nhật thông tin không gian.');
  }
  function canManageMember(member: Member) {
    return manage && member.userId !== user.id && member.role !== 'OWNER' && (workspace.role === 'OWNER' || member.role !== 'ADMIN');
  }
  const canRevoke = (invitation: Invitation) => manage && (workspace.role === 'OWNER' || invitation.role !== 'ADMIN');
  const orderedMembers = [...members].sort((a, b) => roleRank[a.role] - roleRank[b.role] || a.user.displayName.localeCompare(b.user.displayName, 'vi'));
  return <>
    <div className="workspace-summary">
      <section className="sp1-panel"><div className="panel-head"><h2>Thông tin không gian</h2><ShieldCheck size={19} aria-hidden="true" /></div><form onSubmit={save}>
        <label>Tên không gian<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={100} required disabled={!manage || pending} /></label>
        <label>Mô tả<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} disabled={!manage || pending} placeholder={manage ? 'Mục tiêu chung của nhóm…' : 'Chưa có mô tả.'} /></label>
        <div className="settings-footer"><span>/{workspace.slug}</span>{manage && <button className="sp1-primary" disabled={pending || !dirty}>{pending ? 'Đang lưu…' : 'Lưu thay đổi'}</button>}</div>
      </form></section>
      <section className="sp1-panel permission-panel"><span className="sp1-eyebrow">Quyền truy cập của bạn</span><h2>{roleNames[workspace.role]}</h2><p>{manage ? 'Bạn có thể cập nhật không gian, mời và quản lý thành viên theo quyền được cấp.' : 'Bạn có thể xem không gian và danh sách thành viên. Chức năng quản trị chỉ dành cho chủ sở hữu và quản trị viên.'}</p><ul><li><Check size={15} aria-hidden="true" />Xem thông tin không gian</li><li><Check size={15} aria-hidden="true" />Xem danh sách thành viên</li>{manage && <li><Check size={15} aria-hidden="true" />Quản trị thành viên theo vai trò</li>}</ul></section>
    </div>
    <section className="sp1-panel"><div className="panel-head"><div><h2>Thành viên</h2><p>{loading ? 'Đang tải…' : loadFailed ? 'Chưa tải được danh sách' : `${members.length} người trong không gian`}</p></div><Users size={20} aria-hidden="true" /></div>
      {loading ? <div className="skeleton-rows" role="status" aria-label="Đang tải thành viên"><i /><i /><i /></div> : loadFailed ? <button type="button" className="sp1-secondary" onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" />Thử lại</button> : <div className="member-table-wrap"><table className="member-table"><thead><tr><th scope="col">Thành viên</th><th scope="col">Vai trò</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{orderedMembers.map(member => <tr key={member.id}>
        <td><div className="member-cell"><div className="sp1-avatar" aria-hidden="true">{initials(member.user.displayName)}</div><div><strong>{member.user.displayName}{member.userId === user.id ? ' (bạn)' : ''}</strong><small>{member.user.email}</small></div></div></td>
        <td>{canManageMember(member) ? <select aria-label={`Vai trò của ${member.user.email}`} value={member.role} disabled={pending} onChange={e => void mutation(() => api(`/workspaces/${workspace.id}/members/${member.id}`, 'PATCH', { role: e.target.value }), 'Đã cập nhật vai trò.')}>{availableRoles.map(r => <option key={r} value={r}>{roleNames[r]}</option>)}</select> : <RoleTag role={member.role} />}</td>
        <td>{canManageMember(member) && <button type="button" className="sp1-danger" disabled={pending} onClick={() => setConfirmation({ title: 'Xóa thành viên?', body: `${member.user.displayName} (${member.user.email}) sẽ mất quyền truy cập không gian này ngay lập tức.`, label: 'Xóa thành viên', run: () => void mutation(() => api(`/workspaces/${workspace.id}/members/${member.id}`, 'DELETE'), 'Đã xóa thành viên khỏi không gian.') })}>Xóa thành viên</button>}</td>
      </tr>)}</tbody></table></div>}
    </section>
    {manage && <section className="sp1-panel"><div className="panel-head"><div><h2>Mời thành viên</h2><p>Lời mời có hiệu lực 7 ngày. Nếu email không đến, bạn có thể sao chép mã và gửi trực tiếp.</p></div></div><form className="sp1-inline-form" onSubmit={invite}><label>Email thành viên<input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} /></label><label>Vai trò<select value={role} onChange={e => setRole(e.target.value as Role)}>{availableRoles.map(r => <option key={r} value={r}>{roleNames[r]}</option>)}</select></label><button className="sp1-primary" disabled={pending}><Plus size={16} aria-hidden="true" />Tạo lời mời</button></form>
      {inviteToken && <div className="invite-created"><label>Mã mời vừa tạo<input readOnly value={inviteToken} onFocus={e => e.target.select()} /></label><button type="button" className="sp1-secondary" onClick={async () => { try { await navigator.clipboard.writeText(inviteToken); setCopied(true); } catch { report({ error: 'Không thể sao chép tự động. Hãy chọn và sao chép mã.' }); } }}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied ? 'Đã sao chép' : 'Sao chép mã'}</button><small>Mã chỉ hiển thị một lần. Nếu mất mã, thu hồi và tạo lời mời mới.</small></div>}
      {invitations.length > 0 && <div className="pending-invites"><h3>Lời mời đang chờ</h3>{invitations.map(inv => <div className="pending-invite" key={inv.id}><div><strong>{inv.email}</strong><small>{roleNames[inv.role]} · hết hạn {new Date(inv.expiresAt).toLocaleDateString('vi-VN')}</small></div>{canRevoke(inv) && <button type="button" className="sp1-text" disabled={pending} aria-label={`Thu hồi lời mời của ${inv.email}`} onClick={() => setConfirmation({ title: 'Thu hồi lời mời?', body: `Mã mời đã gửi cho ${inv.email} sẽ không dùng được nữa.`, label: 'Thu hồi', run: () => void mutation(() => api(`/workspaces/${workspace.id}/invitations/${inv.id}`, 'DELETE'), 'Đã thu hồi lời mời.') })}>Thu hồi</button>}</div>)}</div>}
    </section>}
    {manage && <AuditPanel workspaceId={workspace.id} members={members} refreshKey={auditKey} fail={fail} />}
    {confirmation && <ConfirmDialog {...confirmation} onClose={() => setConfirmation(null)} />}
  </>;
}
