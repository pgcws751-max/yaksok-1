import TabBar from '../../components/TabBar.jsx';
import { MenuRow } from '../../components/ui.jsx';
import { navigate } from '../../router.js';
import { accountLabel } from '../../lib/account.js';
import { isStandalone, pushWanted } from '../../lib/pwa.js';
import { FONT_LABEL, fontSize } from '../../lib/fontSize.js';

export default function Settings({ ctx }) {
  const { user, data } = ctx;
  const s = data.settings;
  return (
    <main className="screen">
      <header className="top">
        <h1 className="title">설정</h1>
      </header>

      <section className="card profile-card">
        <span className="avatar">
          {user.name.slice(0, 1)}
        </span>
        <div>
          <b>{user.name}님</b>
          <span>{accountLabel(user)}</span>
        </div>
      </section>

      <div className="menu-group">
        <MenuRow
          icon="bell"
          title="알림 설정"
          desc={s.notify ? `켜짐${pushWanted() ? ' · 앱이 닫혀도 알림' : ''}${s.remind ? ` · 안 드시면 ${s.remindMinutes}분 뒤 다시` : ''}` : '꺼짐'}
          onClick={() => navigate('/settings/notify')}
        />
        <MenuRow icon="download" title="앱으로 설치하기" desc={isStandalone() ? '설치됨' : '홈 화면에 아이콘 추가'} onClick={() => navigate('/settings/install')} />
        <MenuRow icon="text" title="글자 크기" desc={FONT_LABEL[fontSize()] || '보통'} onClick={() => navigate('/settings/display')} />
        <MenuRow icon="user" title="내 정보" desc="정보 수정, 비밀번호 변경" onClick={() => navigate('/settings/profile')} />
        <MenuRow icon="door" title="계정" desc="로그아웃, 회원탈퇴" onClick={() => navigate('/settings/account')} />
      </div>

      <p className="foot-note">약속 v1.1 · {user.provider === 'demo' ? '체험 기록은 이 기기에만 저장돼요' : '기록은 서버에 안전하게 저장돼요'}</p>
      <TabBar current="settings" />
    </main>
  );
}
