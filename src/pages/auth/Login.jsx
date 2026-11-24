import { useState } from 'react';
import * as api from '../../lib/api.js';
import { navigate } from '../../router.js';
import { ErrorBox, Field } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';

export default function Login({ ctx }) {
  const [form, setForm] = useState({ username: '', password: '', autoLogin: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
          <Icon name="pill" size={40} color="#fff" strokeWidth={2.4} />
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

      <div className="pad" style={{ display: 'grid', gap: 12, padding: '8px 24px 32px' }}>
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
