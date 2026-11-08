'use client';

import { MouseEvent, ReactNode, useEffect, useId, useRef } from 'react';
import { Moon, Sun, X } from 'lucide-react';
import type { Member, Role } from '../lib/api';
import { initials, roleNames } from '../lib/format';

export type Confirmation = { title: string; body: string; label: string; run: () => void };

export function useAutoClear(value: string, clear: () => void) {
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(clear, 6000);
    return () => clearTimeout(timer);
  }, [value, clear]);
}

export function ThemeButton({ dark, onTheme, className = '' }: { dark: boolean; onTheme: () => void; className?: string }) {
  return <button type="button" className={`btn-secondary ${className}`} onClick={onTheme}>{dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}<span className="button-label">{dark ? 'Giao diện sáng' : 'Giao diện tối'}</span></button>;
}

/** Native dialog: traps focus, closes on Escape and returns focus to the control that opened it. */
export function Modal({ title, onClose, children, variant = 'dialog' }: { title: string; onClose: () => void; children: ReactNode; variant?: 'dialog' | 'drawer' }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);
  function backdrop(event: MouseEvent<HTMLDialogElement>) { if (event.target === dialog.current) onClose(); }
  return <dialog ref={dialog} className={`modal modal-${variant}`} aria-labelledby={titleId} onClick={backdrop} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="modal-body">
      <div className="modal-head"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Đóng" onClick={onClose}><X size={18} aria-hidden="true" /></button></div>
      {children}
    </div>
  </dialog>;
}

export function ConfirmDialog({ title, body, label, run, onClose }: Confirmation & { onClose: () => void }) {
  return <Modal title={title} onClose={onClose}>
    <p>{body}</p>
    <div className="modal-actions"><button type="button" className="btn-secondary" autoFocus onClick={onClose}>Hủy</button><button type="button" className="btn-danger solid" onClick={() => { onClose(); run(); }}>{label}</button></div>
  </Modal>;
}

export function RoleTag({ role }: { role: Role }) {
  return <span className={`tag ${role === 'OWNER' || role === 'ADMIN' ? 'tag-accent' : ''}`}>{roleNames[role]}</span>;
}

export function Avatar({ name }: { name: string }) {
  return <span className="avatar" aria-hidden="true">{initials(name)}</span>;
}

export function Notice({ error, success, onDismiss }: { error?: string; success?: string; onDismiss?: () => void }) {
  const close = onDismiss && <button type="button" className="notice-close" aria-label="Đóng thông báo" onClick={onDismiss}><X size={16} aria-hidden="true" /></button>;
  return <>{error && <div role="alert" className="notice error"><span>{error}</span>{close}</div>}{success && <div role="status" className="notice success"><span>{success}</span>{close}</div>}</>;
}

export function Skeleton({ label }: { label: string }) {
  return <div className="skeleton-rows" role="status" aria-label={label}><i /><i /><i /></div>;
}

export function MemberSelect({ members, value, onChange, label, emptyLabel = 'Chưa giao', disabled }: { members: Member[]; value: string; onChange: (userId: string) => void; label: string; emptyLabel?: string; disabled?: boolean }) {
  return <select aria-label={label} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
    <option value="">{emptyLabel}</option>
    {members.map(member => <option key={member.userId} value={member.userId}>{member.user.displayName}</option>)}
  </select>;
}
