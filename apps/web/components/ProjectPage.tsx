'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ListChecks, Plus } from 'lucide-react';
import { api, ApiError, message, Project, Task } from '../lib/api';
import { canWriteProjects, canWriteTasks, dayKey, dueGroup, formatDay, projectStatusNames } from '../lib/format';
import { useWorkspace } from './context';
import { ProjectDialog } from './ProjectDialog';
import { Avatar, MemberSelect, Skeleton } from './ui';

export function ProjectPage({ projectId }: { projectId: string }) {
  const { workspace, members, fail, go, href, openTask, report, dataKey, touchData } = useWorkspace();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [addError, setAddError] = useState('');
  const [pending, setPending] = useState(false);
  const base = `/workspaces/${workspace.id}`;
  const load = useCallback(async () => {
    try {
      const [item, list] = await Promise.all([api<Project>(`${base}/projects/${projectId}`), api<Task[]>(`${base}/projects/${projectId}/tasks`)]);
      setProject(item); setTasks(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setMissing(true); else fail(err);
    }
  }, [base, projectId, fail]);
  useEffect(() => { void load(); }, [load, dataKey]);
  const canTask = canWriteTasks(workspace.role);
  const closed = project?.status === 'COMPLETED' || project?.status === 'CANCELLED';
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setPending(true); setAddError('');
    try {
      await api(`${base}/projects/${projectId}/tasks`, 'POST', { title, assigneeId: assigneeId || null, dueAt: dueAt || null });
      setTitle(''); setDueAt(''); touchData();
      document.getElementById('new-task-title')?.focus();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) fail(err); else setAddError(message(err));
    } finally { setPending(false); }
  }
  async function patch(task: Task, data: { assigneeId?: string | null; dueAt?: string | null }) {
    report({});
    try { await api(`${base}/tasks/${task.id}`, 'PATCH', { ...data, version: task.version }); }
    catch (err) { fail(err); }
    touchData();
  }
  const back = <a className="back-link" href={href({ page: 'projects' })} onClick={event => { event.preventDefault(); go({ page: 'projects' }); }}><ArrowLeft size={16} aria-hidden="true" />Tất cả dự án</a>;
  if (missing) return <div className="page">{back}<div className="empty"><h1>Không tìm thấy dự án</h1><p>Dự án không tồn tại hoặc thuộc không gian khác.</p></div></div>;
  if (!project || !tasks) return <div className="page">{back}<Skeleton label="Đang tải dự án" /></div>;
  return <div className="page">
    {back}
    <header className="page-head">
      <div>
        <h1>{project.name}</h1>
        <p className="meta-line"><span className={`tag status-${project.status.toLowerCase()}`}>{projectStatusNames[project.status]}</span><span>Phụ trách: <b>{project.owner?.displayName ?? 'chưa có'}</b></span>{project.startAt && <span>Bắt đầu <b>{formatDay(project.startAt)}</b></span>}{project.targetAt && <span>Hạn <b>{formatDay(project.targetAt)}</b></span>}</p>
        {project.description && <p className="page-description">{project.description}</p>}
      </div>
      {canWriteProjects(workspace.role) && <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>Sửa dự án</button>}
    </header>
    {canTask && !closed && <form className="quick-add" onSubmit={add}>
      <label className="quick-title"><span className="sr-only">Tên nhiệm vụ mới</span><input id="new-task-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Thêm nhiệm vụ rồi nhấn Enter" autoComplete="off" /></label>
      <MemberSelect members={members} value={assigneeId} onChange={setAssigneeId} label="Người thực hiện của nhiệm vụ mới" />
      <label className="quick-date"><span className="sr-only">Hạn của nhiệm vụ mới</span><input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} /></label>
      <button className="btn-primary" disabled={pending || !title.trim()}><Plus size={16} aria-hidden="true" />Thêm nhiệm vụ</button>
    </form>}
    {addError && <p role="alert" className="field-error">{addError}</p>}
    {closed && <p className="closed-note">Dự án đã đóng nên không thêm được nhiệm vụ mới. Đổi trạng thái để mở lại.</p>}
    {tasks.length === 0 ? <div className="empty"><ListChecks size={28} aria-hidden="true" /><h2>Chưa có nhiệm vụ</h2><p>{canTask ? 'Gõ tên việc cần làm vào ô phía trên.' : 'Nhiệm vụ của dự án sẽ hiện ở đây.'}</p></div>
      : <ul className="rows task-rows">{tasks.map(task => {
        const due = dueGroup(task.dueAt);
        const overdue = due === 'overdue';
        return <li key={task.id}>
          <button type="button" className="row-main" onClick={() => openTask(task.id)}><strong>{task.title}</strong><small><span className="key-chip">{task.humanReadableKey}</span></small></button>
          {canTask ? <>
            <span className="row-field"><MemberSelect members={members} value={task.assignee?.id ?? ''} onChange={value => void patch(task, { assigneeId: value || null })} label={`Người thực hiện của ${task.title}`} /></span>
            <label className={`row-field ${overdue ? 'is-overdue' : due === 'today' ? 'is-today' : ''}`}><span className="sr-only">Hạn của {task.title}</span><input type="date" value={dayKey(task.dueAt)} onChange={e => void patch(task, { dueAt: e.target.value || null })} /></label>
          </> : <>
            <span className="row-person">{task.assignee ? <><Avatar name={task.assignee.displayName} />{task.assignee.displayName}</> : 'Chưa giao'}</span>
            <span className={`row-date ${overdue ? 'is-overdue' : ''}`}>{task.dueAt ? formatDay(task.dueAt) : 'Chưa đặt hạn'}</span>
          </>}
        </li>;
      })}</ul>}
    {editing && <ProjectDialog project={project} onClose={() => setEditing(false)} onSaved={saved => { setEditing(false); setProject(saved); report({ notice: 'Đã lưu dự án.' }); touchData(); }} />}
  </div>;
}
