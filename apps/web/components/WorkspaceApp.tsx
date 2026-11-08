'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, FolderKanban, House, KeyRound, LogOut, Orbit, Plus, Settings, Users } from 'lucide-react';
import { api, ApiError, Identity, Member, message, Workspace } from '../lib/api';
import { canWriteTasks, firstName, slugify } from '../lib/format';
import { Route, routeHref, useRoute } from '../lib/route';
import { Report, WorkspaceContext, WorkspaceContextValue } from './context';
import { HomePage } from './HomePage';
import { MembersPage } from './MembersPage';
import { ProjectPage } from './ProjectPage';
import { ProjectsPage } from './ProjectsPage';
import { SettingsPage } from './SettingsPage';
import { TaskDrawer } from './TaskDrawer';
import { Avatar, Modal, Notice, Skeleton, ThemeButton, useAutoClear } from './ui';

const navigation = [
  { page: 'home', label: 'Tổng quan', icon: House },
  { page: 'projects', label: 'Dự án', icon: FolderKanban },
  { page: 'members', label: 'Thành viên', icon: Users },
  { page: 'settings', label: 'Cài đặt', icon: Settings },
] as const;

export function WorkspaceApp({ identity, onSignedOut, onExpired, dark, onTheme }: { identity: Identity; onSignedOut: () => void; onExpired: () => void; dark: boolean; onTheme: () => void }) {
  const [route, navigate] = useRoute();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<'create' | 'join' | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [dataKey, setDataKey] = useState(0);
  const report = useCallback<Report>(next => { setError(next.error ?? ''); setNotice(next.notice ?? ''); }, []);
  const clearNotice = useCallback(() => setNotice(''), []);
  useAutoClear(notice, clearNotice);
  const fail = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) onExpired();
    else report({ error: message(err) });
  }, [onExpired, report]);
  const reloadWorkspaces = useCallback(async () => { setWorkspaces(await api<Workspace[]>('/workspaces')); }, []);
  useEffect(() => { reloadWorkspaces().catch(fail).finally(() => setLoading(false)); }, [reloadWorkspaces, fail]);
  useEffect(() => {
    const invite = window.location.hash.match(/^#invite=([a-f0-9]{64})$/);
    if (!invite) return;
    // Clear the token from the address bar and history once it is in the form.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setInviteToken(invite[1]);
    setDialog('join');
  }, []);
  const workspace = workspaces.find(item => item.id === route.workspaceId) ?? workspaces[0];
  const workspaceId = workspace?.id;
  const reloadMembers = useCallback(async () => {
    if (workspaceId) setMembers(await api<Member[]>(`/workspaces/${workspaceId}/members`));
  }, [workspaceId]);
  // Refetched on each page change so people who just joined can be assigned work.
  useEffect(() => { reloadMembers().catch(fail); }, [reloadMembers, fail, route.page]);

  const taskOpenedHere = useRef(false);
  const go = useCallback((next: Omit<Route, 'workspaceId'>) => navigate({ ...next, workspaceId }), [navigate, workspaceId]);
  const context = useMemo<WorkspaceContextValue | null>(() => workspace ? {
    workspace, user: identity.user, members, dataKey, reloadWorkspaces, reloadMembers, report, fail, go,
    touchData: () => setDataKey(key => key + 1),
    openTask: taskId => { taskOpenedHere.current = true; go({ page: route.page, projectId: route.projectId, taskId }); },
    href: next => routeHref({ ...next, workspaceId: workspace.id }),
  } : null, [workspace, identity.user, members, dataKey, reloadWorkspaces, reloadMembers, report, fail, go, route.page, route.projectId]);

  function closeTask() {
    // Closing leaves no extra history entry, so Back returns to the previous page, not the drawer.
    if (taskOpenedHere.current) { taskOpenedHere.current = false; window.history.back(); }
    else navigate({ page: route.page, projectId: route.projectId, workspaceId }, { replace: true });
  }

  async function logout() {
    report({});
    try { await api('/auth/logout', 'POST'); onSignedOut(); } catch (err) { fail(err); }
  }
  const joined = async (item: Workspace, text: string) => {
    await reloadWorkspaces();
    setDialog(null); setInviteToken('');
    navigate({ page: 'home', workspaceId: item.id });
    report({ notice: text });
  };
  const dialogs = <>
    {dialog === 'create' && <CreateWorkspaceDialog onClose={() => setDialog(null)} onCreated={item => joined(item, `Đã tạo ${item.name}.`)} onExpired={onExpired} />}
    {dialog === 'join' && <JoinDialog initialToken={inviteToken} onClose={() => { setDialog(null); setInviteToken(''); }} onJoined={item => joined(item, `Đã tham gia ${item.name}.`)} onExpired={onExpired} />}
  </>;
  const toast = <div className="toast-region"><Notice error={error} success={notice} onDismiss={() => report({})} /></div>;

  if (loading) return <div className="page-loading"><Skeleton label="Đang tải không gian" /></div>;
  if (!workspace || !context) {
    return <div className="welcome">
      <header className="welcome-top"><div className="logo"><Orbit size={24} aria-hidden="true" />orbit</div><div className="welcome-actions"><ThemeButton dark={dark} onTheme={onTheme} /><button type="button" className="btn-text" onClick={logout}><LogOut size={16} aria-hidden="true" />Đăng xuất</button></div></header>
      <main id="main-content" className="welcome-main">
        <h1>Chào {firstName(identity.user.displayName)}, bắt đầu từ đâu?</h1>
        <p>Không gian là nơi nhóm của bạn làm việc chung.</p>
        <div className="welcome-choices">
          <button type="button" className="choice" onClick={() => setDialog('create')}><Plus size={22} aria-hidden="true" /><strong>Tạo không gian đầu tiên</strong><span>Dành cho người lập nhóm</span></button>
          <button type="button" className="choice" onClick={() => setDialog('join')}><KeyRound size={22} aria-hidden="true" /><strong>Nhập mã mời</strong><span>Dành cho người được mời</span></button>
        </div>
      </main>
      {dialogs}{toast}
    </div>;
  }
  const active = route.page === 'project' ? 'projects' : route.page;
  return <WorkspaceContext.Provider value={context}>
    <div className="shell">
      <aside className="sidebar">
        <div className="logo"><Orbit size={22} aria-hidden="true" />orbit</div>
        <div className="sidebar-workspace">
          <label className="workspace-picker"><span className="sr-only">Không gian làm việc</span><span className="select-wrap"><select value={workspace.id} onChange={event => { report({}); navigate({ page: 'home', workspaceId: event.target.value }); }}>{workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></span></label>
          <div className="sidebar-actions">
            <button type="button" className="btn-text" onClick={() => setDialog('create')}><Plus size={15} aria-hidden="true" /><span className="button-label">Tạo không gian</span></button>
            <button type="button" className="btn-text" onClick={() => setDialog('join')}><KeyRound size={15} aria-hidden="true" /><span className="button-label">Nhập mã mời</span></button>
          </div>
        </div>
        <nav className="nav" aria-label="Điều hướng chính">
          {navigation.map(({ page, label, icon: Icon }) => <a key={page} href={context.href({ page })} aria-current={active === page ? 'page' : undefined} onClick={event => { event.preventDefault(); report({}); go({ page }); }}><Icon size={18} aria-hidden="true" /><span>{label}</span></a>)}
        </nav>
        <div className="sidebar-footer">
          <div className="profile"><Avatar name={identity.user.displayName} /><div><strong>{identity.user.displayName}</strong><small>{identity.user.email}</small></div></div>
          <ThemeButton dark={dark} onTheme={onTheme} />
          <button type="button" className="btn-text" onClick={logout}><LogOut size={16} aria-hidden="true" /><span className="button-label">Đăng xuất</span></button>
        </div>
      </aside>
      <main id="main-content" className="main" tabIndex={-1}>
        {route.page === 'home' && <HomePage canAdd={canWriteTasks(workspace.role)} />}
        {route.page === 'projects' && <ProjectsPage />}
        {route.page === 'project' && (route.projectId ? <ProjectPage key={route.projectId} projectId={route.projectId} /> : <ProjectsPage />)}
        {route.page === 'members' && <MembersPage key={workspace.id} />}
        {route.page === 'settings' && <SettingsPage key={workspace.id} />}
      </main>
      {route.taskId && <TaskDrawer key={route.taskId} taskId={route.taskId} onClose={closeTask} />}
      {dialogs}{toast}
    </div>
  </WorkspaceContext.Provider>;
}

function CreateWorkspaceDialog({ onClose, onCreated, onExpired }: { onClose: () => void; onCreated: (item: Workspace) => Promise<void>; onExpired: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try { await onCreated(await api<Workspace>('/workspaces', 'POST', { name, slug })); }
    catch (err) { if (err instanceof ApiError && err.status === 401) onExpired(); else { setError(message(err)); setPending(false); } }
  }
  return <Modal title="Tạo không gian" onClose={onClose}><form onSubmit={submit}>
    <label>Tên không gian<input autoFocus value={name} onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} minLength={2} maxLength={100} required /></label>
    <label>Đường dẫn ngắn<input value={slug} onChange={e => { setSlugEdited(true); setSlug(e.target.value.toLowerCase()); }} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={60} required aria-describedby="slug-hint" /></label>
    <small id="slug-hint" className="field-hint">Tự điền theo tên. Chỉ gồm chữ thường, số và dấu gạch ngang.</small>
    <Notice error={error} />
    <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Hủy</button><button className="btn-primary" disabled={pending}>{pending ? 'Đang tạo…' : 'Tạo không gian'}</button></div>
  </form></Modal>;
}

function JoinDialog({ initialToken, onClose, onJoined, onExpired }: { initialToken: string; onClose: () => void; onJoined: (item: Workspace) => Promise<void>; onExpired: () => void }) {
  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = token.trim();
    if (!/^[a-f0-9]{64}$/.test(value)) { setError('Mã mời gồm 64 ký tự chữ thường và số. Hãy sao chép lại toàn bộ mã.'); return; }
    setPending(true); setError('');
    try { await onJoined(await api<Workspace>('/invitations/accept', 'POST', { token: value })); }
    catch (err) { if (err instanceof ApiError && err.status === 401) onExpired(); else { setError(message(err)); setPending(false); } }
  }
  return <Modal title="Nhập mã mời" onClose={onClose}><form onSubmit={submit} noValidate>
    <p>Dùng tài khoản có email trùng với email được mời.</p>
    <label className="spaced">Mã mời<input autoFocus value={token} onChange={e => { setToken(e.target.value); setError(''); }} autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error ? 'token-error' : undefined} /></label>
    {error && <p id="token-error" role="alert" className="field-error">{error}</p>}
    <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Hủy</button><button className="btn-primary" disabled={pending}>{pending ? 'Đang tham gia…' : 'Tham gia'}</button></div>
  </form></Modal>;
}
