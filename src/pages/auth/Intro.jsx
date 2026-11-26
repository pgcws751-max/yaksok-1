import { useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { save } from '../../lib/storage.js';
import { navigate } from '../../router.js';

export const INTRO_SEEN = 'yaksok:introSeen';

// 1장: 알림
function ArtAlarm() {
  return (
    <div className="intro-art" aria-hidden="true">
      <div className="ia-ring r1" />
      <div className="ia-ring r2" />
      <div className="ia-bell">
        <Icon name="bell" size={44} strokeWidth={2} />
      </div>
      <div className="ia-chip c1">
        <span className="ia-pill orange" />
        혈압약 · 낮 12:30
      </div>
      <div className="ia-chip c2">
        <span className="ia-pill blue" />
        당뇨약 · 오후 6:30
      </div>
    </div>
  );
}

// 2장: 체크
function ArtCheck() {
  const rows = [
    { name: '혈압약', sub: '1알 · 식후', color: 'orange', on: true },
    { name: '당뇨약', sub: '1알 · 식후', color: 'blue', on: true },
    { name: '비타민D', sub: '1알', color: 'green', on: false },
  ];
  return (
    <div className="intro-art" aria-hidden="true">
      <div className="ia-card">
        {rows.map((r) => (
          <div className="ia-row" key={r.name}>
            <span className={`ia-ic ${r.color}`}>
              <span className={`ia-pill ${r.color}`} />
            </span>
            <span className="ia-txt">
              <b>{r.name}</b>
              <small>{r.sub}</small>
            </span>
            <span className={`ia-check ${r.on ? 'on' : ''}`}>
              <Icon name="check" size={16} strokeWidth={3} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3장: 점수
function ArtScore() {
  const c = 2 * Math.PI * 46;
  return (
    <div className="intro-art" aria-hidden="true">
      <div className="ia-card ia-score">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="46" fill="none" stroke="#EEF0F3" strokeWidth="14" />
          <circle cx="60" cy="60" r="46" fill="none" stroke="#3182F6" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c * 0.88} ${c}`} transform="rotate(-90 60 60)" className="ia-arc" />
          <text x="60" y="68" textAnchor="middle" fontSize="26" fontWeight="900" fill="#191F28">88%</text>
        </svg>
        <div className="ia-stats">
          <div>
            <small>연속 복용</small>
            <b>12일</b>
          </div>
          <div>
            <small>이번 주</small>
            <b className="good">88%</b>
          </div>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  { Art: ArtAlarm, title: '약 먹을 시간,\n이제 놓치지 마세요', desc: '약마다 정한 시간이 되면\n알림으로 알려 드려요' },
  { Art: ArtCheck, title: '체크 한 번으로\n기록 끝', desc: '"먹었어요"만 누르면\n복용 기록이 차곡차곡 쌓여요' },
  { Art: ArtScore, title: '복약 점수로\n건강한 습관을', desc: '연속 복용일과 복용률을\n한눈에 확인해요' },
];

export default function Intro() {
  const [i, setI] = useState(0);
  const startX = useRef(null);
  const last = i === SLIDES.length - 1;

  const finish = (to = '/login') => {
    save(INTRO_SEEN, true);
    navigate(to, { replace: true });
  };
  const go = (n) => setI(Math.max(0, Math.min(SLIDES.length - 1, n)));

  const { Art, title, desc } = SLIDES[i];

  return (
    <main
      className="screen intro"
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
        startX.current = null;
      }}
    >
      <div className="intro-top">
        <span className="intro-brand">
          <span className="intro-logo">
            <Icon name="pill" size={16} color="#fff" strokeWidth={2.4} />
          </span>
          약속
        </span>
        {!last && (
          <button type="button" className="btn-text" onClick={() => finish()}>
            건너뛰기
          </button>
        )}
      </div>

      <section className="intro-slide" key={i} aria-roledescription="소개 화면" aria-label={`${SLIDES.length}장 중 ${i + 1}번째`}>
        <Art />
        <h1 className="intro-title">{title}</h1>
        <p className="intro-desc">{desc}</p>
      </section>

      <div className="intro-dots" role="tablist" aria-label="소개 화면 선택">
        {SLIDES.map((_, n) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={n === i}
            aria-label={`${n + 1}번째 소개 보기`}
            className={n === i ? 'on' : ''}
            onClick={() => go(n)}
          />
        ))}
      </div>

      <div className="intro-actions">
        {last ? (
          <>
            <button type="button" className="btn-primary" onClick={() => finish('/signup')}>
              시작하기
            </button>
            <button type="button" className="btn-text" onClick={() => finish('/login')}>
              이미 계정이 있어요
            </button>
          </>
        ) : (
          <button type="button" className="btn-primary" onClick={() => go(i + 1)}>
            다음
          </button>
        )}
      </div>
    </main>
  );
}
