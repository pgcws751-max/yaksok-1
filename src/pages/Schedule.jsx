import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import TabBar from '../components/TabBar.jsx';
import { SNOOZE_MINUTES, STEP_MINUTES } from '../data.js';
import { formatTime } from '../time.js';

const ICON_COLOR = { sunrise: '#A64B0B', sun: '#A64B0B', moon: '#3B4A8C' };

export default function Schedule({ slots, onSave, onBack, onNavigate }) {
  // 저장 전까지는 화면 안에서만 바꿉니다.
  const [draft, setDraft] = useState(() =>
    slots.map(({ id, label, icon, minutes, enabled }) => ({ id, label, icon, minutes, enabled })),
  );
  const [saved, setSaved] = useState(false);

  const update = (id, patch) => {
    setSaved(false);
    setDraft((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const shift = (s, delta) => update(s.id, { minutes: (s.minutes + delta + 1440) % 1440 });

  return (
    <main className="screen">
      <header style={{ padding: '20px 24px 0' }}>
        <button type="button" className="back" onClick={onBack}>
          <Icon name="back" size={26} strokeWidth={2.6} />
          뒤로
        </button>
        <h1 className="title" style={{ marginTop: 6 }}>
          약 드실 시간
        </h1>
        <div className="sub">버튼을 눌러 시간을 바꿔요</div>
      </header>

      <div className="set-list">
        {draft.map((s) => {
          const timeLabel = formatTime(s.minutes);
          return (
            <section key={s.id} className={`card set ${s.enabled ? '' : 'is-off'}`} aria-label={`${s.label} 약 시간`}>
              <div className="set-head">
                <Icon name={s.icon} size={30} color={ICON_COLOR[s.icon]} strokeWidth={2.2} />
                <span className="label">{s.label}</span>
                <button
                  type="button"
                  className="toggle"
                  aria-pressed={s.enabled}
                  onClick={() => update(s.id, { enabled: !s.enabled })}
                >
                  {s.enabled ? '알림 켜짐' : '알림 꺼짐'}
                  <span className="track">
                    <span className="knob" />
                  </span>
                </button>
              </div>

              <div className="stepper">
                <button
                  type="button"
                  className="round"
                  aria-label={`${s.label} 시간 ${STEP_MINUTES}분 빠르게`}
                  disabled={!s.enabled}
                  onClick={() => shift(s, -STEP_MINUTES)}
                >
                  <Icon name="minus" size={26} />
                </button>
                <output aria-live="polite">{timeLabel}</output>
                <button
                  type="button"
                  className="round"
                  aria-label={`${s.label} 시간 ${STEP_MINUTES}분 늦게`}
                  disabled={!s.enabled}
                  onClick={() => shift(s, STEP_MINUTES)}
                >
                  <Icon name="plus" size={26} />
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="hint">
        <Icon name="bell" size={26} color="#1F6F54" strokeWidth={2.4} style={{ flex: 'none' }} />
        <span>안 드시면 {SNOOZE_MINUTES}분 뒤에 다시 알려요</span>
      </div>

      <div className="save-wrap">
        <button
          type="button"
          className={`btn-primary ${saved ? 'saved' : ''}`}
          onClick={() => {
            onSave(draft);
            setSaved(true);
          }}
        >
          {saved ? '저장했어요' : '저장하기'}
        </button>
      </div>

      <TabBar current="schedule" onNavigate={onNavigate} />
    </main>
  );
}
