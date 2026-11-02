'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ChevronDown, FolderKanban, LogOut, Orbit, Plus, Users } from 'lucide-react';
import { api, ApiError, Identity, message, Workspace } from '../lib/api';
import { initials, slugify } from '../lib/format';
import { Notice, Report, RoleTag, ThemeButton, useAutoClear } from './ui';
import { WorkspaceDetail } from './WorkspaceDetail';

export function WorkspaceApp({ identity, onSignedOut, onExpired, dark, onTheme }: { identity: Identity; onSignedOut: () => void; onExpired: () => void; dark: boolean; onTheme: () => void }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const report = useCallback<Report>(next => { setError(next.error ?? ''); setNotice(next.notice ?? ''); }, []);
  const clearNotice = useCallback(() => setNotice(''), []);
  useAutoClear(notice, clearNotice);
  const fail = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) onExpired();
    else report({ error: message(err) });
  }, [onExpired, report]);
  const reload = useCallback(async () => {
    const items = await api<Workspace[]>('/workspaces');
    setWorkspaces(items);
    setSelected(current => items.some(w => w.id === current) ? current : items[0]?.id ?? '');
  }, []);
  useEffect(() => { reload().catch(fail).finally(() => setLoading(false)); }, [reload, fail]);
  async function createWorkspace(event: FormEvent) {
    event.preventDefault(); setPending(true); report({});
    try {
      const item = await api<Workspace>('/workspaces', 'POST', { name, slug });
      await reload(); setSelected(item.id); setName(''); setSlug(''); setSlugEdited(false); setCreate(false); report({ notice: 'Đã tạo không gian làm việc.' });
    } catch (err) { fail(err); } finally { setPending(false); }
  }
  async function accept(event: FormEvent) {
    event.preventDefault(); report({});
    const value = token.trim();
    if (!/^[a-f0-9]{64}$/.test(value)) { setTokenError('Mã mời gồm 64 ký tự chữ thường và số. Hãy sao chép lại toàn bộ mã.'); return; }
    setPending(true); setTokenError('');
    try {
      const joined = await api<Workspace>('/invitations/accept', 'POST', { token: value });
      await reload(); setSelected(joined.id); setToken(''); report({ notice: `Đã tham gia ${joined.name}.` });
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) setTokenError(err.message); else fail(err);
    } finally { setPending(false); }
  }
  async function logout() {
    setPending(true); report({});
    try { await api('/auth/logout', 'POST'); onSignedOut(); }
    catch (err) { fail(err); } finally { setPending(false); }
  }
  const workspace = workspaces.find(item => item.id === selected);
  return <div className="workspace-layout">
    <aside className="sp1-sidebar">
      <div className="sp1-logo"><Orbit size={23} aria-hidden="true" />orbit</div>
      <div className="sidebar-group">
        <label className="workspace-picker"><span className="sidebar-label">Không gian làm việc</span><span className="select-wrap"><select value={selected} onChange={event => { report({}); setSelected(event.target.value); }}><option value="" disabled>Chọn không gian</option>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></span></label>
        <button type="button" className="sp1-secondary" aria-expanded={create} onClick={() => setCreate(!create)}><Plus size={16} aria-hidden="true" /><span className="button-label">Tạo không gian</span></button>
      </div>
      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        <a className="sp1-nav-active" href="#main-content" aria-current="page"><Users size={17} aria-hidden="true" />Không gian và thành viên</a>
        <div className="sidebar-planning"><FolderKanban size={17} aria-hidden="true" /><span>Dự án và nhiệm vụ</span><small>Sắp có</small></div>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-profile"><div className="sp1-avatar" aria-hidden="true">{initials(identity.user.displayName)}</div><div><strong>{identity.user.displayName}</strong><small>{identity.user.email}</small></div></div>
        <ThemeButton dark={dark} onTheme={onTheme} />
        <button type="button" className="sp1-text" disabled={pending} onClick={logout}><LogOut size={16} aria-hidden="true" /><span className="button-label">Đăng xuất</span></button>
      </div>
    </aside>
    <main id="main-content" className="sp1-main" tabIndex={-1}>
      <header className="sp1-topbar"><span className="crumbs">Không gian / <strong>{workspace?.name ?? 'Bắt đầu'}</strong></span><span className="auth-mode">{identity.authMode === 'local' ? 'Bản học tập · PostgreSQL cục bộ' : 'Supabase Auth'}</span></header>
      <div className="sp1-body">
        <div className="sp1-page-heading"><div><h1>Không gian của nhóm</h1><p>Tập hợp thành viên, phân quyền và bắt đầu cộng tác.</p></div>{workspace && <RoleTag role={workspace.role} />}</div>
        <Notice error={error} success={notice} onDismiss={() => report({})} />
        {create && <section className="sp1-panel"><div className="panel-head"><h2>Tạo không gian làm việc</h2><button type="button" className="sp1-text" onClick={() => setCreate(false)}>Hủy</button></div><form className="sp1-inline-form" onSubmit={createWorkspace}>
          <label>Tên không gian<input autoFocus value={name} onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} minLength={2} maxLength={100} required /></label>
          <div className="form-field"><label>Đường dẫn ngắn<input value={slug} onChange={e => { setSlugEdited(true); setSlug(e.target.value.toLowerCase()); }} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={60} required aria-describedby="slug-hint" /></label><small id="slug-hint" className="field-hint">Chữ thường, số và dấu gạch ngang.</small></div>
          <button className="sp1-primary" disabled={pending}>{pending ? 'Đang tạo…' : 'Tạo không gian'}</button>
        </form></section>}
        {loading ? <div className="sp1-panel"><div className="skeleton-rows" role="status" aria-label="Đang tải không gian"><i /><i /><i /></div></div> : workspace ? <WorkspaceDetail key={workspace.id} workspace={workspace} user={identity.user} onChanged={reload} report={report} fail={fail} /> : !create && <section className="sp1-panel sp1-empty"><div className="empty-icon"><Users size={28} aria-hidden="true" /></div><h2>Bắt đầu cùng nhóm của bạn</h2><p>Tạo một không gian mới hoặc nhận lời mời từ người quản lý.</p><button type="button" className="sp1-primary" onClick={() => setCreate(true)}><Plus size={16} aria-hidden="true" />Tạo không gian đầu tiên</button></section>}
        <section className="sp1-panel invitation-accept"><div><h2>Bạn có mã mời?</h2><p>Dùng tài khoản có email trùng với email được mời.</p></div><form onSubmit={accept} noValidate><div className="token-row"><label className="sr-only" htmlFor="invitation-token">Mã mời</label><input id="invitation-token" value={token} onChange={e => { setToken(e.target.value); setTokenError(''); }} required maxLength={512} placeholder="Dán mã mời vào đây" autoComplete="off" aria-invalid={tokenError ? true : undefined} aria-describedby={tokenError ? 'token-error' : undefined} /><button className="sp1-secondary" disabled={pending}>Tham gia</button></div>{tokenError && <p id="token-error" role="alert" className="field-error">{tokenError}</p>}</form></section>
      </div>
    </main>
  </div>;
}
