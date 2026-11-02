'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Orbit, ShieldCheck, Users } from 'lucide-react';
import { api, Identity, message } from '../lib/api';
import { Notice, ThemeButton } from './ui';

export function AuthScreen({ onSignedIn, initialError, dark, onTheme }: { onSignedIn: (identity: Identity) => void; initialError: string; dark: boolean; onTheme: () => void }) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (window.location.hash.startsWith('#invite=')) setNotice('Hãy đăng nhập hoặc đăng ký bằng email nhận lời mời để tham gia.');
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(''); setNotice('');
    try {
      const result = await api<Identity & { requiresConfirmation?: boolean }>('/auth/' + (register ? 'register' : 'login'), 'POST', register ? { displayName: name, email, password } : { email, password });
      if (result.requiresConfirmation) { setNotice('Hãy xác nhận email rồi đăng nhập.'); setRegister(false); setPassword(''); }
      else { onSignedIn(result); }
    } catch (err) { setError(message(err)); } finally { setPending(false); }
  }
  return <div className="auth-layout">
    <section className="auth-intro">
      <div className="sp1-logo"><Orbit size={26} aria-hidden="true" />orbit</div>
      <div className="intro-copy">
        <h1>Một không gian.<br />Cả nhóm cùng làm.</h1>
        <p>Tổ chức nhóm, quản lý thành viên và xây dựng nền tảng cho những dự án tiếp theo.</p>
        <ul className="intro-features">
          <li><ShieldCheck size={20} aria-hidden="true" />Quyền truy cập rõ ràng cho từng thành viên</li>
          <li><Users size={20} aria-hidden="true" />Mời đồng đội vào đúng không gian làm việc</li>
        </ul>
      </div>
      <div className="orbit-art" aria-hidden="true"><i /><i /><b /></div>
    </section>
    <main id="main-content" className="auth-form-area">
      <ThemeButton dark={dark} onTheme={onTheme} className="auth-theme" />
      <div className="auth-card">
        <h2>{register ? 'Tạo tài khoản' : 'Đăng nhập'}</h2>
        <p>{register ? 'Tạo tài khoản để bắt đầu làm việc cùng nhóm.' : 'Tiếp tục với không gian làm việc của bạn.'}</p>
        <div className="auth-tabs"><button type="button" aria-pressed={!register} onClick={() => { setRegister(false); setError(''); }}>Đăng nhập</button><button type="button" aria-pressed={register} onClick={() => { setRegister(true); setError(''); }}>Đăng ký</button></div>
        <form onSubmit={submit}>
          {register && <label>Họ và tên<input name="displayName" autoComplete="name" value={name} onChange={e => setName(e.target.value)} minLength={1} maxLength={100} required /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required /></label>
          <div className="password-field">
            <label>Mật khẩu<input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} minLength={10} maxLength={128} required aria-describedby={register ? 'password-hint' : undefined} /></label>
            <button type="button" className="icon-button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
          </div>
          {register && <small id="password-hint" className="field-hint">Ít nhất 10 ký tự.</small>}
          <Notice error={error} success={notice} />
          <button className="sp1-primary full" disabled={pending}>{pending ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}<ArrowRight size={17} aria-hidden="true" /></button>
        </form>
      </div>
    </main>
  </div>;
}
