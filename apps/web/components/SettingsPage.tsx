'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { canManageMembers, canWriteProjects, canWriteTasks, roleNames } from '../lib/format';
import { AuditPanel } from './AuditPanel';
import { useWorkspace } from './context';

export function SettingsPage() {
  const { workspace, members, reloadWorkspaces, report, fail, dataKey } = useWorkspace();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description);
  const [pending, setPending] = useState(false);
  const [saves, setSaves] = useState(0);
  const manage = canManageMembers(workspace.role);
  const dirty = name.trim() !== workspace.name || description.trim() !== workspace.description;
  // A newer version from the server replaces the form, so a stale draft cannot be re-saved over it.
  useEffect(() => { setName(workspace.name); setDescription(workspace.description); }, [workspace.version, workspace.name, workspace.description]);
  async function save(event: FormEvent) {
    event.preventDefault(); setPending(true); report({});
    try {
      await api(`/workspaces/${workspace.id}`, 'PATCH', { name, description, version: workspace.version });
      await reloadWorkspaces(); setSaves(count => count + 1);
      report({ notice: 'Đã cập nhật thông tin không gian.' });
    } catch (err) {
      fail(err);
      if (err instanceof ApiError && [403, 404, 409].includes(err.status)) await reloadWorkspaces().catch(() => {});
    } finally { setPending(false); }
  }
  const rights = [
    { allowed: true, text: 'Xem dự án, nhiệm vụ và thành viên' },
    { allowed: canWriteTasks(workspace.role), text: 'Tạo, sửa và giao nhiệm vụ' },
    { allowed: canWriteProjects(workspace.role), text: 'Tạo và sửa dự án' },
    { allowed: manage, text: 'Mời và quản lý thành viên' },
  ];
  return <div className="page">
    <header className="page-head"><div><h1>Cài đặt</h1><p>Thông tin chung của {workspace.name}.</p></div></header>
    <div className="settings-grid">
      <section className="section" aria-labelledby="info-title"><h2 id="info-title">Thông tin không gian</h2><form onSubmit={save}>
        <label>Tên không gian<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={100} required disabled={!manage || pending} /></label>
        <label>Mô tả<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} disabled={!manage || pending} placeholder={manage ? 'Mục tiêu chung của nhóm…' : 'Chưa có mô tả.'} /></label>
        {manage && <button className="btn-primary" disabled={pending || !dirty}>{pending ? 'Đang lưu…' : 'Lưu thay đổi'}</button>}
      </form></section>
      <section className="section permission-panel" aria-labelledby="rights-title"><h2 id="rights-title">Quyền của bạn: {roleNames[workspace.role]}</h2><ul className="rights">{rights.map(right => <li key={right.text} className={right.allowed ? '' : 'is-denied'}>{right.allowed ? 'Được' : 'Không được'}: {right.text.toLowerCase()}</li>)}</ul></section>
    </div>
    {manage && <AuditPanel workspaceId={workspace.id} members={members} refreshKey={dataKey + saves} fail={fail} />}
  </div>;
}
