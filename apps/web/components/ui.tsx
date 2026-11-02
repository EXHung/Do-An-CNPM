'use client';

import { useEffect, useId, useRef } from 'react';
import { Moon, Sun, X } from 'lucide-react';
import type { Role } from '../lib/api';
import { roleNames } from '../lib/format';

export type Report = (next: { error?: string; notice?: string }) => void;
export type Confirmation = { title: string; body: string; label: string; run: () => void };

export function useAutoClear(value: string, clear: () => void) {
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(clear, 6000);
    return () => clearTimeout(timer);
  }, [value, clear]);
}

export function ThemeButton({ dark, onTheme, className = '' }: { dark: boolean; onTheme: () => void; className?: string }) {
  return <button type="button" className={`sp1-secondary ${className}`} onClick={onTheme}>{dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}<span className="button-label">{dark ? 'Giao diện sáng' : 'Giao diện tối'}</span></button>;
}

export function ConfirmDialog({ title, body, label, run, onClose }: Confirmation & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="sp1-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id={titleId}>{title}</h2><p>{body}</p>
    <div className="dialog-actions"><button type="button" className="sp1-secondary" autoFocus onClick={onClose}>Hủy</button><button type="button" className="sp1-danger solid" onClick={() => { onClose(); run(); }}>{label}</button></div>
  </dialog>;
}

export function RoleTag({ role }: { role: Role }) {
  return <span className={`role-tag role-${role.toLowerCase()}`}>{roleNames[role]}</span>;
}

export function Notice({ error, success, onDismiss }: { error?: string; success?: string; onDismiss?: () => void }) {
  const close = onDismiss && <button type="button" className="notice-close" aria-label="Đóng thông báo" onClick={onDismiss}><X size={16} aria-hidden="true" /></button>;
  return <>{error && <div role="alert" className="sp1-notice error"><span>{error}</span>{close}</div>}{success && <div role="status" className="sp1-notice success"><span>{success}</span>{close}</div>}</>;
}
