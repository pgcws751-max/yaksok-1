import { useState } from 'react';
import * as api from '../../lib/api.js';
import { requestNotify } from '../../lib/notify.js';
import { ErrorBox, Field, SubHeader } from '../../components/ui.jsx';

export default function Signup({ ctx }) {
  const [form, setForm] = useState({ username: '', password: '', password2: '', name: '', phone: '', agreePush: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) return setError('비밀번호 두 칸이 서로 달라요');
    setBusy(true);
    try {
      await api.signUp(form);
      if (form.agreePush) await requestNotify();
      ctx.setUser(await api.logIn({ username: form.username, password: form.password, autoLogin: true }));
      ctx.toast(`${form.name}님, 반가워요!`);
    } catch (err) {
      setError(err.userMessage || '가입하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <SubHeader title="회원가입" sub="다섯 가지만 적어 주세요" back="/login" />
      <form className="form" onSubmit={submit} noValidate>
        <Field label="아이디" name="username" autoComplete="username" hint="영문·숫자 4~20자" value={form.username} onChange={set('username')} />
        <Field label="비밀번호" name="password" type="password" autoComplete="new-password" hint="6자 이상" value={form.password} onChange={set('password')} />
        <Field label="비밀번호 한 번 더" name="password2" type="password" autoComplete="new-password" value={form.password2} onChange={set('password2')} />
        <Field label="이름" name="name" autoComplete="name" value={form.name} onChange={set('name')} />
        <Field label="연락처" name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000" value={form.phone} onChange={set('phone')} />
        <label className="check">
          <input type="checkbox" checked={form.agreePush} onChange={set('agreePush')} />
          <span>
            약 드실 시간에 알림 받기
            <small>나중에 설정에서 바꿀 수 있어요</small>
          </span>
        </label>
        <ErrorBox message={error} />
        <button type="submit" className="btn-primary" disabled={busy}>
          가입하기
        </button>
      </form>
    </main>
  );
}
