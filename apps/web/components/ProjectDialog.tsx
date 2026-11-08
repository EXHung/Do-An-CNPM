'use client';

import { FormEvent, useState } from 'react';
import { api, ApiError, message, Project, ProjectStatus } from '../lib/api';
import { dayKey, projectStatusNames } from '../lib/format';
import { useWorkspace } from './context';
import { MemberSelect, Modal, Notice } from './ui';

export function ProjectDialog({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved: (saved: Project) => void }) {
  const { workspace, user, members, fail } = useWorkspace();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [ownerId, setOwnerId] = useState(project ? project.owner?.id ?? '' : user.id);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'PLANNED');
  const [startAt, setStartAt] = useState(dayKey(project?.startAt));
  const [targetAt, setTargetAt] = useState(dayKey(project?.targetAt));
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    const data = { name, description, ownerId: ownerId || null, status, startAt: startAt || null, targetAt: targetAt || null };
    const base = `/workspaces/${workspace.id}/projects`;
    try {
      onSaved(project ? await api<Project>(`${base}/${project.id}`, 'PATCH', { ...data, version: project.version }) : await api<Project>(base, 'POST', data));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) fail(err);
      else { setError(message(err)); setPending(false); }
    }
  }
  return <Modal title={project ? 'Sửa dự án' : 'Tạo dự án'} onClose={onClose}><form onSubmit={submit}>
    <label>Tên dự án<input autoFocus value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={100} required /></label>
    <label>Mô tả<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} placeholder="Dự án này nhằm đạt điều gì?" /></label>
    <div className="form-grid">
      <label>Người phụ trách<MemberSelect members={members} value={ownerId} onChange={setOwnerId} label="Người phụ trách" emptyLabel="Chưa có" /></label>
      <label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>{Object.entries(projectStatusNames).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
      <label>Ngày bắt đầu<input type="date" value={startAt} onChange={e => setStartAt(e.target.value)} /></label>
      <label>Ngày kết thúc<input type="date" value={targetAt} min={startAt || undefined} onChange={e => setTargetAt(e.target.value)} /></label>
    </div>
    <Notice error={error} />
    <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Hủy</button><button className="btn-primary" disabled={pending}>{pending ? 'Đang lưu…' : project ? 'Lưu thay đổi' : 'Tạo dự án'}</button></div>
  </form></Modal>;
}
