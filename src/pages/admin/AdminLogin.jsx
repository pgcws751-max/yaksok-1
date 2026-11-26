import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, Field } from '../../components/ui.jsx';
import * as api from '../../lib/api.js';
import { navigate } from '../../router.js';

// 관리자 전용 로그인 창 (#/admin/login)
export default function AdminLogin({ ctx }) {
  const { user, setUser } = ctx;
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return setError('관리자 아이디와 비밀번호를 적어 주세요');
    setBusy(true);
    setError('');
    try {
      const u = await api.logIn({ ...form, autoLogin: false });
      if (!u.isAdmin) {
        await api.logOut();
        setUser(null);
        setError('관리자 계정이 아니에요. 관리자 아이디로 로그인해 주세요');
        return;
      }
      setUser(u);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.userMessage || '로그인하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <form className="card adm-login-card" onSubmit={submit} noValidate>
        <div className="adm-login-brand">
          <span className="splash-logo" style={{ width: 52, height: 52, borderRadius: 16, margin: 0 }}>
            <Icon name="pill" size={26} color="#fff" strokeWidth={2.4} />
          </span>
          <div>
            <h1>약속 관리자</h1>
            <p>관리자만 들어올 수 있어요</p>
          </div>
        </div>

        {user && !user.isAdmin && (
          <p className="notice" style={{ margin: 0 }}>
            지금 일반 회원({user.username || user.name})으로 로그인되어 있어요. 관리자 아이디로 로그인하면 바뀌어요.
          </p>
        )}

        <Field label="관리자 아이디" name="username" autoComplete="username" value={form.username} onChange={set('username')} />
        <Field label="비밀번호" name="password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
        <ErrorBox message={error} />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? '확인하는 중…' : '관리자 로그인'}
        </button>
        <p className="field-hint" style={{ textAlign: 'center' }}>
          보안을 위해 브라우저를 닫으면 로그아웃돼요. 관리자 비밀번호는 찾기 기능으로 바꿀 수 없어요.
        </p>
        <button type="button" className="btn-text" onClick={() => navigate(user ? '/home' : '/login')}>
          회원용 앱으로 가기
        </button>
      </form>
    </div>
  );
}
