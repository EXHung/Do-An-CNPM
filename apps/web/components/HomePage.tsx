'use client';

import { useEffect, useState } from 'react';
import { Check, CircleCheckBig } from 'lucide-react';
import { api, Project, Task } from '../lib/api';
import { canManageMembers, canWriteProjects, DueGroup, dueGroup, dueGroupNames, firstName, formatDay, projectStatusNames } from '../lib/format';
import { useWorkspace } from './context';
import { ProjectDialog } from './ProjectDialog';
import { Skeleton } from './ui';

const order: DueGroup[] = ['overdue', 'today', 'week', 'later', 'none'];

export function HomePage({ canAdd }: { canAdd: boolean }) {
  const { workspace, user, members, fail, go, href, openTask, report, dataKey } = useWorkspace();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    Promise.all([api<Task[]>(`/workspaces/${workspace.id}/my-tasks`), api<Project[]>(`/workspaces/${workspace.id}/projects`)])
      .then(([mine, list]) => { setTasks(mine); setProjects(list); }).catch(fail);
  }, [workspace.id, fail, dataKey]);
  if (!tasks || !projects) return <div className="page"><Skeleton label="Đang tải tổng quan" /></div>;
  const groups = order.map(group => ({ group, items: tasks.filter(task => dueGroup(task.dueAt) === group) })).filter(entry => entry.items.length);
  const openProjects = projects.filter(project => project.status === 'PLANNED' || project.status === 'ACTIVE');
  const firstProject = openProjects[0];
  const steps = [
    { done: projects.length > 0, title: 'Tạo dự án', text: canWriteProjects(workspace.role) ? 'Gom công việc theo một mục tiêu.' : 'Quản lý của nhóm sẽ tạo dự án.', action: canWriteProjects(workspace.role) ? <button type="button" className="btn-primary" onClick={() => setCreating(true)}>Tạo dự án</button> : null },
    { done: projects.some(project => project.taskCount > 0), title: 'Thêm nhiệm vụ', text: 'Ghi việc cần làm và giao người thực hiện.', action: firstProject && canAdd ? <button type="button" className="btn-secondary" onClick={() => go({ page: 'project', projectId: firstProject.id })}>Mở dự án</button> : null },
    { done: members.length > 1, title: 'Mời đồng đội', text: 'Thêm người vào không gian để cùng làm.', action: canManageMembers(workspace.role) ? <button type="button" className="btn-secondary" onClick={() => go({ page: 'members' })}>Mời thành viên</button> : null },
  ];
  const showSetup = steps.some(step => !step.done);
  return <div className="page">
    <header className="page-head"><div><h1>Chào {firstName(user.displayName)}</h1><p>{tasks.length ? `Bạn có ${tasks.length} việc đang mở trong ${workspace.name}.` : `Hiện chưa có việc nào giao cho bạn trong ${workspace.name}.`}</p></div></header>
    {showSetup && <section className="section" aria-labelledby="setup-title"><h2 id="setup-title">Bắt đầu với nhóm của bạn</h2><ol className="setup">{steps.map(step => <li key={step.title} className={step.done ? 'is-done' : ''}><span className="setup-mark" aria-hidden="true">{step.done && <Check size={14} />}</span><div><strong>{step.title}{step.done && <span className="sr-only"> (đã xong)</span>}</strong><small>{step.text}</small></div>{!step.done && step.action}</li>)}</ol></section>}
    <div className="home-grid">
      <section className="section" aria-labelledby="my-work-title">
        <h2 id="my-work-title">Việc của tôi</h2>
        {!tasks.length ? <div className="empty small"><CircleCheckBig size={24} aria-hidden="true" /><p>Khi được giao nhiệm vụ, việc sẽ hiện ở đây theo hạn hoàn thành.</p></div>
          : groups.map(({ group, items }) => <div key={group} className={`due-group due-${group}`}><h3>{dueGroupNames[group]}<span>{items.length}</span></h3><ul className="rows">{items.map(task => <li key={task.id}><button type="button" className="row-main" onClick={() => openTask(task.id)}><strong>{task.title}</strong><small>{task.project.name}</small></button>{task.dueAt && <span className="row-date">{formatDay(task.dueAt)}</span>}</li>)}</ul></div>)}
      </section>
      <section className="section" aria-labelledby="open-projects-title">
        <h2 id="open-projects-title">Dự án đang mở</h2>
        {!openProjects.length ? <p>Chưa có dự án đang mở.</p> : <ul className="rows">{openProjects.slice(0, 6).map(project => <li key={project.id}><a className="row-main" href={href({ page: 'project', projectId: project.id })} onClick={event => { event.preventDefault(); go({ page: 'project', projectId: project.id }); }}><strong>{project.name}</strong><small>{project.taskCount} nhiệm vụ · {projectStatusNames[project.status]}</small></a></li>)}</ul>}
      </section>
    </div>
    {creating && <ProjectDialog onClose={() => setCreating(false)} onSaved={saved => { setCreating(false); report({ notice: `Đã tạo dự án ${saved.name}.` }); go({ page: 'project', projectId: saved.id }); }} />}
  </div>;
}
