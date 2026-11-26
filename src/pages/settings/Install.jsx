import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { SubHeader } from '../../components/ui.jsx';
import { canPromptInstall, isIOS, isStandalone, onInstallChange, promptInstall } from '../../lib/pwa.js';

function Step({ n, children }) {
  return (
    <li className="step">
      <span className="step-n">{n}</span>
      <span>{children}</span>
    </li>
  );
}

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="공유 버튼" role="img" style={{ verticalAlign: '-3px' }}>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M5 12v7h14v-7" />
  </svg>
);

export default function Install({ ctx }) {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const installed = isStandalone();
  const ios = isIOS();
  useEffect(() => onInstallChange(setCanPrompt), []);

  const install = async () => {
    const r = await promptInstall();
    if (r === 'accepted') ctx.toast('홈 화면에 약속을 추가했어요');
  };

  return (
    <main className="screen">
      <SubHeader title="앱으로 설치하기" sub="홈 화면 아이콘으로 바로 열 수 있어요" back="/settings" />

      <section className="card install-card">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width="64" height="64" />
        <div>
          <b>약속</b>
          <span>{installed ? '지금 설치된 앱으로 보고 있어요' : '주소창 없이 앱처럼 열려요'}</span>
        </div>
      </section>

      {installed ? (
        <p className="notice ok">이미 설치되어 있어요. 알림 설정에서 "앱이 닫혀 있어도 알림 받기"를 켜 두세요.</p>
      ) : canPrompt ? (
        <div className="pad" style={{ marginTop: 16 }}>
          <button type="button" className="btn-primary with-icon" onClick={install}>
            <Icon name="plus" size={20} />
            홈 화면에 추가하기
          </button>
        </div>
      ) : ios ? (
        <section className="card steps-card">
          <h2>아이폰 · 아이패드 (사파리)</h2>
          <ol className="steps">
            <Step n={1}>
              사파리 아래쪽(또는 위쪽)의 <b>공유 버튼</b> <ShareIcon />을 눌러요
            </Step>
            <Step n={2}>
              목록을 내려 <b>홈 화면에 추가</b>를 눌러요
            </Step>
            <Step n={3}>
              오른쪽 위 <b>추가</b>를 누르면 홈 화면에 약속 아이콘이 생겨요
            </Step>
            <Step n={4}>홈 화면의 약속 아이콘으로 열고, 알림 설정에서 알림을 켜 주세요</Step>
          </ol>
          <p className="field-hint">아이폰은 홈 화면에 추가한 앱에서만 앱이 닫혀 있을 때 알림을 받을 수 있어요. (iOS 16.4 이상)</p>
        </section>
      ) : (
        <section className="card steps-card">
          <h2>안드로이드 (크롬) · PC</h2>
          <ol className="steps">
            <Step n={1}>
              브라우저 오른쪽 위 <b>⋮ 메뉴</b>를 눌러요
            </Step>
            <Step n={2}>
              <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 눌러요
            </Step>
            <Step n={3}>
              <b>설치</b>를 누르면 홈 화면(바탕화면)에 약속 아이콘이 생겨요
            </Step>
          </ol>
          <p className="field-hint">메뉴에 항목이 없다면 크롬에서 열어 주세요.</p>
        </section>
      )}
    </main>
  );
}
