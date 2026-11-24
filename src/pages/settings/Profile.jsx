import { useState } from 'react';
import * as api from '../../lib/api.js';
import { ErrorBox, Field, SubHeader } from '../../components/ui.jsx';

function phoneText(p) {
  return p.length === 11 ? `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}` : p;
}

export default function Profile({ ctx }) {
  const { user, setUser, toast } = ctx;
  const [info, setInfo] = useState({ name: user.name, phone: phoneText(user.phone) });
  const [pw, setPw] = useState({ current: '', next: '', next2: '' });
  const [infoErr, setInfoErr] = useState('');
  const [pwErr, setPwErr] = useState('');

  const saveInfo = async (e) => {
    e.preventDefault();
    try {
      setInfoErr('');
      setUser(await api.updateProfile(user.id, info));
      toast('내 정보를 저장했어요');
    } catch (err) {
      setInfoErr(err.userMessage || '저장하지 못했어요');
    }
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.next2) return setPwErr('새 비밀번호 두 칸이 서로 달라요');
    try {
      setPwErr('');
      await api.changePassword(user.id, pw);
      setPw({ current: '', next: '', next2: '' });
      toast('비밀번호를 바꿨어요');
    } catch (err) {
      setPwErr(err.userMessage || '바꾸지 못했어요');
    }
  };

  return (
    <main className="screen">
      <SubHeader title="내 정보" back="/settings" />

      <h2 className="section-title">정보 수정</h2>
      <form className="form" style={{ marginTop: 0 }} onSubmit={saveInfo} noValidate>
        <div className="field">
          <label>아이디</label>
          <p className="readonly">{user.username}</p>
        </div>
        <Field label="이름" name="name" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
        <Field label="연락처" name="phone" type="tel" inputMode="numeric" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
        <ErrorBox message={infoErr} />
        <button type="submit" className="btn-primary">정보 저장</button>
      </form>

      <h2 className="section-title">비밀번호 변경</h2>
      <form className="form" style={{ marginTop: 0, paddingBottom: 28 }} onSubmit={savePw} noValidate>
        <Field label="지금 비밀번호" name="current" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <Field label="새 비밀번호" name="next" type="password" autoComplete="new-password" hint="6자 이상" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <Field label="새 비밀번호 한 번 더" name="next2" type="password" autoComplete="new-password" value={pw.next2} onChange={(e) => setPw({ ...pw, next2: e.target.value })} />
        <ErrorBox message={pwErr} />
        <button type="submit" className="btn-outline">비밀번호 바꾸기</button>
      </form>
    </main>
  );
}
