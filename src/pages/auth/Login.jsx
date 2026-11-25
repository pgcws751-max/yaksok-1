import { useEffect, useState } from 'react';
import * as api from '../../lib/api.js';
import { navigate } from '../../router.js';
import { ErrorBox, Field } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';

export default function Login({ ctx }) {
  const [form, setForm] = useState({ username: '', password: '', autoLogin: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState([]);
  useEffect(() => {
    api.oauthProviders().then(setProviders);
  }, []);
  const social = async (p) => {
    try {
      setError('');
      await api.signInWithProvider(p);
    } catch (err) {
      setError(err.userMessage || '간편 로그인을 시작하지 못했어요');
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return setError('아이디와 비밀번호를 적어 주세요');
    setBusy(true);
    try {
      ctx.setUser(await api.logIn(form));
    } catch (err) {
      setError(err.userMessage || '로그인하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const demo = async () => {
    ctx.setUser(await api.startDemo());
    ctx.toast('체험 계정으로 들어왔어요');
  };

  return (
    <main className="screen auth">
      <div className="brand">
        <span className="logo">
          <Icon name="pill" size={30} color="#fff" strokeWidth={2.4} />
        </span>
        <h1 className="title">약속</h1>
        <p className="sub">약 드실 시간을 챙겨 드려요</p>
      </div>

      <form className="form" onSubmit={submit} noValidate>
        <Field label="아이디" name="username" autoComplete="username" value={form.username} onChange={set('username')} />
        <Field label="비밀번호" name="password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
        <label className="check">
          <input type="checkbox" checked={form.autoLogin} onChange={set('autoLogin')} />
          <span>자동 로그인</span>
        </label>
        <ErrorBox message={error} />
        <button type="submit" className="btn-primary" disabled={busy}>
          로그인
        </button>
      </form>

      <div className="links">
        <button type="button" onClick={() => navigate('/find-id')}>아이디 찾기</button>
        <span aria-hidden="true">|</span>
        <button type="button" onClick={() => navigate('/find-password')}>비밀번호 찾기</button>
      </div>

      {providers.length > 0 && (
        <div className="social">
          <span className="social-label">간편 로그인</span>
          {providers.includes('kakao') && (
            <button type="button" className="btn-kakao" onClick={() => social('kakao')}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4C6.9 4 3 7.2 3 11.1c0 2.5 1.6 4.7 4.1 6l-.8 3.1c-.1.3.2.5.5.4l3.6-2.4c.5.1 1 .1 1.6.1 5.1 0 9-3.2 9-7.2S17.1 4 12 4z" /></svg>
              카카오로 시작하기
            </button>
          )}
          {providers.includes('google') && (
            <button type="button" className="btn-google" onClick={() => social('google')}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 01-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0012 23z" /><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 010-4.3V7.1H2.1a11 11 0 000 9.9l3.7-2.8z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.2-3.2A11 11 0 002.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" /></svg>
              구글로 시작하기
            </button>
          )}
        </div>
      )}

      <div className="pad" style={{ display: 'grid', gap: 12, padding: '8px 20px 32px' }}>
        <button type="button" className="btn-outline" onClick={() => navigate('/signup')}>
          처음이세요? 회원가입
        </button>
        <button type="button" className="btn-text" onClick={demo}>
          가입 없이 체험해 보기
        </button>
      </div>
    </main>
  );
}
