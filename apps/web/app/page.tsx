'use client';

import { useCallback, useEffect, useState } from 'react';
import { Orbit } from 'lucide-react';
import './sp1.css';
import { AuthScreen } from '../components/AuthScreen';
import { WorkspaceApp } from '../components/WorkspaceApp';
import { api, ApiError, Identity, message } from '../lib/api';

const THEME_KEY = 'orbit-theme';
const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

export default function Home() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [booting, setBooting] = useState(true);
  const [initialError, setInitialError] = useState('');
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let active = true;
    api<Identity>('/me').then(result => { if (active) setIdentity(result); }).catch(error => {
      if (active && (!(error instanceof ApiError) || error.status !== 401)) setInitialError(message(error));
    }).finally(() => { if (active) setBooting(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    // Browser storage can be blocked; the theme then simply lasts for this page view.
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(THEME_KEY); } catch { /* no stored theme */ }
    setDark(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    try { window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch { /* not persisted */ }
  }
  const expire = useCallback(() => { setInitialError(SESSION_EXPIRED); setIdentity(null); }, []);
  return <div className={`sp1 ${dark ? 'sp1-dark' : ''}`}>
    <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
    {booting ? <div className="sp1-loading" role="status"><Orbit size={22} aria-hidden="true" />Đang kiểm tra phiên đăng nhập…</div> : identity ? <WorkspaceApp identity={identity} onSignedOut={() => { setInitialError(''); setIdentity(null); }} onExpired={expire} dark={dark} onTheme={toggleTheme} /> : <AuthScreen onSignedIn={setIdentity} initialError={initialError} dark={dark} onTheme={toggleTheme} />}
  </div>;
}
