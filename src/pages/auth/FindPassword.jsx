import { useState } from 'react';
import * as api from '../../lib/api.js';
import { navigate } from '../../router.js';
import { ErrorBox, Field, SubHeader } from '../../components/ui.jsx';

export default function FindPassword({ ctx }) {
  const [form, setForm] = useState({ username: '', name: '', phone: '', password: '', password2: '' });
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const verify = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setUserId((await api.verifyIdentity(form)).userId);
    } catch (err) {
      setError(err.userMessage || '본인 확인에 실패했어요');
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) return setError('비밀번호 두 칸이 서로 달라요');
    try {
      await api.resetPassword({ userId, password: form.password });
      ctx.toast('비밀번호를 바꿨어요. 새 비밀번호로 로그인하세요');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.userMessage || '바꾸지 못했어요');
    }
  };

  if (userId) {
    return (
      <main className="screen">
        <SubHeader title="새 비밀번호" sub="본인 확인이 끝났어요" back="/login" />
        <form className="form" onSubmit={reset} noValidate>
          <Field label="새 비밀번호" name="password" type="password" autoComplete="new-password" hint="6자 이상" value={form.password} onChange={set('password')} />
          <Field label="새 비밀번호 한 번 더" name="password2" type="password" autoComplete="new-password" value={form.password2} onChange={set('password2')} />
          <ErrorBox message={error} />
          <button type="submit" className="btn-primary">
            비밀번호 바꾸기
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="screen">
      <SubHeader title="비밀번호 찾기" sub="본인 확인 후 새 비밀번호를 정해요" back="/login" />
      <form className="form" onSubmit={verify} noValidate>
        <Field label="아이디" name="username" autoComplete="username" value={form.username} onChange={set('username')} />
        <Field label="이름" name="name" autoComplete="name" value={form.name} onChange={set('name')} />
        <Field label="연락처" name="phone" type="tel" inputMode="numeric" placeholder="010-0000-0000" value={form.phone} onChange={set('phone')} />
        <ErrorBox message={error} />
        <button type="submit" className="btn-primary">
          본인 확인
        </button>
      </form>
    </main>
  );
}
