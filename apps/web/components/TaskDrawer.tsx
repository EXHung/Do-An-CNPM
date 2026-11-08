'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, message, Task } from '../lib/api';
import { canWriteTasks, dayKey, formatDay } from '../lib/format';
import { useWorkspace } from './context';
import { ConfirmDialog, MemberSelect, Modal, Notice, Skeleton } from './ui';

export function TaskDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { workspace, members, fail, report, touchData } = useWorkspace();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const url = `/workspaces/${workspace.id}/tasks/${taskId}`;
  const show = (item: Task) => { setTask(item); setTitle(item.title); setDescription(item.description ?? ''); setAssigneeId(item.assignee?.id ?? ''); setDueAt(dayKey(item.dueAt)); };
  useEffect(() => {
    api<Task>(url).then(show).catch(err => {
      if (err instanceof ApiError && err.status === 401) fail(err); else setError(message(err));
    });
  }, [url, fail]);
  const canEdit = canWriteTasks(workspace.role);
  async function run(action: () => Promise<void>) {
    setPending(true); setError('');
    try { await action(); }
    catch (err) {
      if (err instanceof ApiError && err.status === 401) { fail(err); return; }
      setError(message(err));
      // Replace a stale form with the saved task so old values cannot be written back.
      if (err instanceof ApiError && err.status === 409) await api<Task>(url).then(show).catch(() => {});
      touchData();
    } finally { setPending(false); }
  }
  const save = (event: FormEvent) => {
    event.preventDefault();
    return run(async () => {
      if (!task) return;
      await api(url, 'PATCH', { title, description, assigneeId: assigneeId || null, dueAt: dueAt || null, version: task.version });
      report({ notice: 'Đã lưu nhiệm vụ.' }); touchData(); onClose();
    });
  };
  const remove = () => run(async () => {
    if (!task) return;
    await api(`${url}?version=${task.version}`, 'DELETE');
    report({ notice: `Đã xóa ${task.humanReadableKey}.` }); touchData(); onClose();
  });
  return <Modal variant="drawer" title={task ? task.humanReadableKey : 'Nhiệm vụ'} onClose={onClose}>
    {!task ? (error ? <Notice error={error} /> : <Skeleton label="Đang tải nhiệm vụ" />) : <form onSubmit={save}>
      <p className="drawer-context">{task.project.name} · {task.status.name}</p>
      <label>Tên nhiệm vụ<input value={title} onChange={e => setTitle(e.target.value)} minLength={1} maxLength={200} required disabled={!canEdit} /></label>
      <label>Mô tả<textarea rows={6} value={description} onChange={e => setDescription(e.target.value)} maxLength={5000} disabled={!canEdit} placeholder={canEdit ? 'Cần làm cụ thể những gì?' : 'Chưa có mô tả.'} /></label>
      <div className="form-grid">
        <label>Người thực hiện<MemberSelect members={members} value={assigneeId} onChange={setAssigneeId} label="Người thực hiện" disabled={!canEdit} /></label>
        <label>Hạn hoàn thành<input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} disabled={!canEdit} /></label>
      </div>
      <small className="field-hint">Tạo bởi {task.createdBy.displayName} ngày {formatDay(task.createdAt)}.</small>
      <Notice error={error} />
      {canEdit && <div className="modal-actions spread"><button type="button" className="btn-danger" disabled={pending} onClick={() => setConfirming(true)}>Xóa nhiệm vụ</button><button className="btn-primary" disabled={pending}>{pending ? 'Đang lưu…' : 'Lưu nhiệm vụ'}</button></div>}
    </form>}
    {confirming && task && <ConfirmDialog title="Xóa nhiệm vụ?" body={`${task.humanReadableKey}: ${task.title} sẽ biến mất khỏi dự án.`} label="Xóa nhiệm vụ" run={() => void remove()} onClose={() => setConfirming(false)} />}
  </Modal>;
}
