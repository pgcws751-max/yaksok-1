import { useState } from 'react';
import * as api from '../../lib/api.js';
import { navigate } from '../../router.js';
import { ErrorBox, Field, SubHeader } from '../../components/ui.jsx';

export default function FindId() {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');
  const [found, setFound] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setFound(await api.findUsername(form));
    } catch (err) {
      setFound(null);
      setError(err.userMessage || '찾지 못했어요');
    }
  };

  return (
    <main className="screen">
      <SubHeader title="아이디 찾기" sub="가입할 때 적은 이름과 연락처를 넣어 주세요" back="/login" />
      {found ? (
        <div className="form">
          <div className="card result">
            <span>찾은 아이디</span>
            <b>{found.username}</b>
            <small>{new Date(found.createdAt).toLocaleDateString('ko-KR')} 가입</small>
          </div>
          <button type="button" className="btn-primary" onClick={() => navigate('/login', { replace: true })}>
            로그인하러 가기
          </button>
          <button type="button" className="btn-outline" onClick={() => navigate('/find-password', { replace: true })}>
            비밀번호 찾기
          </button>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <Field label="이름" name="name" autoComplete="name" value={form.name} onChange={set('name')} />
          <Field label="연락처" name="phone" type="tel" inputMode="numeric" placeholder="010-0000-0000" value={form.phone} onChange={set('phone')} />
          <ErrorBox message={error} />
          <button type="submit" className="btn-primary">
            아이디 찾기
          </button>
        </form>
      )}
    </main>
  );
}
