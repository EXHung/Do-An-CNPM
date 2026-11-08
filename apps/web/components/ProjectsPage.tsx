'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import { api, Project } from '../lib/api';
import { canWriteProjects, formatDay, projectStatusNames } from '../lib/format';
import { useWorkspace } from './context';
import { ProjectDialog } from './ProjectDialog';
import { Skeleton } from './ui';

export function ProjectsPage() {
  const { workspace, fail, go, href, report, dataKey } = useWorkspace();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const load = useCallback(() => api<Project[]>(`/workspaces/${workspace.id}/projects`).then(setProjects).catch(fail), [workspace.id, fail]);
  useEffect(() => { void load(); }, [load, dataKey]);
  const canCreate = canWriteProjects(workspace.role);
  return <div className="page">
    <header className="page-head"><div><h1>Dự án</h1><p>Mỗi dự án gom các nhiệm vụ của một mục tiêu.</p></div>{canCreate && <button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Tạo dự án</button>}</header>
    {!projects ? <Skeleton label="Đang tải dự án" /> : projects.length === 0 ? <div className="empty"><FolderKanban size={28} aria-hidden="true" /><h2>Chưa có dự án nào</h2><p>{canCreate ? 'Tạo dự án đầu tiên để bắt đầu giao việc cho nhóm.' : 'Quản lý của nhóm sẽ tạo dự án tại đây.'}</p>{canCreate && <button type="button" className="btn-primary" onClick={() => setCreating(true)}>Tạo dự án đầu tiên</button>}</div>
      : <ul className="rows project-rows">{projects.map(project => <li key={project.id}>
        <a className="row-main" href={href({ page: 'project', projectId: project.id })} onClick={event => { event.preventDefault(); go({ page: 'project', projectId: project.id }); }}><strong>{project.name}</strong><small><span className="key-chip">{project.key}</span> {project.taskCount} nhiệm vụ</small></a>
        <span className="row-owner">{project.owner?.displayName ?? 'Chưa có người phụ trách'}</span>
        <span className="row-date">{project.targetAt ? `Đến ${formatDay(project.targetAt)}` : 'Chưa đặt hạn'}</span>
        <span className={`tag status-${project.status.toLowerCase()}`}>{projectStatusNames[project.status]}</span>
      </li>)}</ul>}
    {creating && <ProjectDialog onClose={() => setCreating(false)} onSaved={saved => { setCreating(false); report({ notice: `Đã tạo dự án ${saved.name}.` }); go({ page: 'project', projectId: saved.id }); }} />}
  </div>;
}
