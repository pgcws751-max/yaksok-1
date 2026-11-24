import { useState } from 'react';
import * as api from '../../lib/api.js';
import { ErrorBox, Field, SubHeader } from '../../components/ui.jsx';

export default function Account({ ctx }) {
  const { user, setUser, toast } = ctx;
  const [leaving, setLeaving] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const logout = async () => {
    if (!window.confirm('로그아웃할까요?')) return;
    await api.logOut();
    setUser(null);
    toast('로그아웃했어요');
  };

  const leave = async (e) => {
    e.preventDefault();
    if (!window.confirm('정말 탈퇴할까요?\n등록한 약과 복용 기록이 모두 지워지고 되돌릴 수 없어요.')) return;
    try {
      await api.withdraw(user.id, password);
      setUser(null);
      toast('탈퇴했어요. 그동안 고마웠어요');
    } catch (err) {
      setError(err.userMessage || '탈퇴하지 못했어요');
    }
  };

  return (
    <main className="screen">
      <SubHeader title="계정" back="/settings" />

      <div className="pad" style={{ marginTop: 20 }}>
        <button type="button" className="btn-primary" onClick={logout}>
          로그아웃
        </button>
      </div>

      <h2 className="section-title" style={{ marginTop: 32 }}>회원탈퇴</h2>
      {!leaving ? (
        <div className="pad">
          <p className="set-desc" style={{ marginTop: 0 }}>탈퇴하면 등록한 약과 복용 기록이 모두 지워져요.</p>
          <button type="button" className="btn-text danger" style={{ paddingLeft: 0 }} onClick={() => setLeaving(true)}>
            회원탈퇴 하기
          </button>
        </div>
      ) : (
        <form className="form" style={{ marginTop: 0 }} onSubmit={leave} noValidate>
          <Field label="비밀번호 확인" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <ErrorBox message={error} />
          <button type="submit" className="btn-danger">탈퇴하기</button>
          <button type="button" className="btn-text" onClick={() => setLeaving(false)}>그만두기</button>
        </form>
      )}
    </main>
  );
}
