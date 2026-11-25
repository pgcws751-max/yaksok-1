import { useState } from 'react';
import { SubHeader, Toggle } from '../../components/ui.jsx';
import { notifyPermission, requestNotify, showNotification } from '../../lib/notify.js';

const PERM_TEXT = {
  granted: '이 기기에서 알림을 받을 수 있어요',
  denied: '브라우저에서 알림이 막혀 있어요. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요',
  default: '아직 알림 허용을 하지 않았어요',
  unsupported: '이 브라우저는 알림을 지원하지 않아요. 앱을 열어 두면 화면으로 알려 드려요',
};

export default function NotifySettings({ ctx }) {
  const { data, update, toast } = ctx;
  const s = data.settings;
  const [perm, setPerm] = useState(notifyPermission);
  const set = (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const turnOn = async (on) => {
    set({ notify: on });
    if (on && perm !== 'granted') setPerm(await requestNotify());
  };

  return (
    <main className="screen">
      <SubHeader title="알림 설정" back="/settings" />

      <div className="set-list">
        <section className="card set">
          <div className="set-head">
            <span className="label">복용 알림</span>
            <Toggle on={s.notify} onChange={turnOn} labelOn="켜짐" labelOff="꺼짐" label="복용 알림" />
          </div>
          <p className="set-desc">약마다 정한 복용시간에 알려 드려요</p>
        </section>

        <section className={`card set ${s.notify ? '' : 'is-off'}`}>
          <div className="set-head">
            <span className="label">다시 알림</span>
            <Toggle on={s.remind && s.notify} onChange={(on) => set({ remind: on })} label="미복용 시 다시 알림" />
          </div>
          <p className="set-desc">'먹었어요'를 누르지 않으면 한 번 더 알려 드려요</p>
          {s.notify && s.remind && (
            <div className="seg compact" role="group" aria-label="다시 알림 간격">
              {[5, 10, 20, 30].map((m) => (
                <button key={m} type="button" aria-pressed={s.remindMinutes === m} onClick={() => set({ remindMinutes: m })}>
                  {m}분 뒤
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className={`notice ${perm === 'granted' ? 'ok' : ''}`}>{PERM_TEXT[perm] || PERM_TEXT.default}</div>

      <div className="pad" style={{ display: 'grid', gap: 12, padding: '16px 20px 28px' }}>
        {perm === 'default' && (
          <button type="button" className="btn-primary" onClick={async () => setPerm(await requestNotify())}>
            알림 허용하기
          </button>
        )}
        {perm === 'granted' && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              showNotification('약속 알림 시험', { body: '이렇게 알려 드릴게요' });
              toast('시험 알림을 보냈어요');
            }}
          >
            시험 알림 보내기
          </button>
        )}
        <p className="field-hint" style={{ margin: 0 }}>
          알림은 이 앱을 열어 둔 동안 울려요. 휴대폰 홈 화면에 추가해 두면 더 편해요.
        </p>
      </div>
    </main>
  );
}
