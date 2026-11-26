import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { SubHeader, Toggle } from '../../components/ui.jsx';
import * as api from '../../lib/api.js';
import { currentSubscription, pushSupport, pushWanted, showLocalNotification, subscribePush, unsubscribePush } from '../../lib/pwa.js';
import { navigate } from '../../router.js';

// 이 기기의 푸시 상태: loading | demo | ios-needs-install | unsupported | denied | on | off
async function readPushState(user) {
  if (user.provider === 'demo') return 'demo';
  const support = pushSupport();
  if (support !== 'ok') return support;
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSubscription();
  return sub && pushWanted() && Notification.permission === 'granted' ? 'on' : 'off';
}

const STATE_TEXT = {
  loading: '확인하는 중이에요',
  demo: '체험 계정은 앱이 열려 있을 때만 알려 드려요. 가입하면 앱이 닫혀 있어도 알림을 받을 수 있어요.',
  'ios-needs-install': '아이폰은 앱을 홈 화면에 추가한 뒤에 알림을 받을 수 있어요. (iOS 16.4 이상)',
  unsupported: '이 브라우저는 앱이 닫혀 있을 때 알림을 지원하지 않아요. 크롬이나 사파리에서 열어 주세요.',
  denied: '이 기기에서 알림이 막혀 있어요. 휴대폰 설정 또는 브라우저 설정에서 이 사이트(앱)의 알림을 허용해 주세요.',
  on: '이 기기로 알림이 와요. 앱을 닫아 두어도 정해진 시간에 알려 드려요.',
  off: '켜면 앱을 닫아 두어도 정해진 시간에 이 기기로 알려 드려요.',
};

export default function NotifySettings({ ctx }) {
  const { user, data, update, toast } = ctx;
  const s = data.settings;
  const [push, setPush] = useState('loading');
  const [busy, setBusy] = useState(false);
  const set = (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  useEffect(() => {
    readPushState(user).then(setPush);
  }, [user]);

  const turnPushOn = async () => {
    setBusy(true);
    try {
      const sub = await subscribePush();
      await api.savePushSubscription(user.id, sub);
      if (!s.notify) set({ notify: true });
      setPush('on');
      toast('이제 앱을 닫아도 알려 드려요');
    } catch (e) {
      if (e.code === 'denied') setPush('denied');
      else if (e.code === 'default') toast('알림 허용을 눌러 주세요');
      else toast(e.userMessage || '알림을 켜지 못했어요. 잠시 후 다시 해 주세요');
      setPush(await readPushState(user));
    } finally {
      setBusy(false);
    }
  };

  const turnPushOff = async () => {
    setBusy(true);
    try {
      const endpoint = await unsubscribePush();
      await api.deletePushSubscription(endpoint);
      setPush('off');
      toast('이 기기의 알림을 껐어요');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    const ok = await showLocalNotification('약속 알림 시험', { body: '이렇게 알려 드릴게요', tag: 'yaksok-test' });
    toast(ok ? '시험 알림을 보냈어요' : '알림을 띄우지 못했어요. 알림 허용을 확인해 주세요');
  };

  return (
    <main className="screen">
      <SubHeader title="알림 설정" back="/settings" />

      <section className="card push-card">
        <div className="push-head">
          <span className={`push-ic ${push === 'on' ? 'on' : ''}`}>
            <Icon name="bell" size={22} strokeWidth={2.2} />
          </span>
          <div className="push-txt">
            <b>앱이 닫혀 있어도 알림 받기</b>
            <span className={push === 'on' ? 'good' : ''}>{push === 'on' ? '이 기기에서 켜짐' : push === 'off' ? '꺼짐' : '이 기기'}</span>
          </div>
        </div>
        <p className="set-desc">{STATE_TEXT[push]}</p>
        {push === 'off' && (
          <button type="button" className="btn-primary" disabled={busy} onClick={turnPushOn}>
            이 기기에서 알림 켜기
          </button>
        )}
        {push === 'on' && (
          <div className="push-actions">
            <button type="button" className="btn-soft" disabled={busy} onClick={turnPushOff}>
              끄기
            </button>
            <button type="button" className="btn-outline" onClick={test}>
              시험 알림 보내기
            </button>
          </div>
        )}
        {push === 'ios-needs-install' && (
          <button type="button" className="btn-primary" onClick={() => navigate('/settings/install')}>
            홈 화면에 추가하는 방법
          </button>
        )}
      </section>

      <div className="set-list">
        <section className="card set">
          <div className="set-head">
            <span className="label">복용 알림</span>
            <Toggle on={s.notify} onChange={(on) => set({ notify: on })} label="복용 알림" />
          </div>
          <p className="set-desc">약마다 정한 복용시간에 알려 드려요. 끄면 모든 기기에서 알림이 멈춰요.</p>
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

      <p className="field-hint" style={{ margin: '14px 20px 28px' }}>
        휴대폰을 무음·방해 금지로 두면 소리 없이 알림만 와요.
      </p>
    </main>
  );
}
