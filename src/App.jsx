import { useCallback, useEffect, useRef, useState } from 'react';
import { DialogHost } from './components/Dialog.jsx';
import * as api from './lib/api.js';
import { dateKey, nowMinutes } from './lib/date.js';
import { slotsOn } from './lib/schedule.js';
import { canNotify, showNotification } from './lib/notify.js';
import { formatTime } from './time.js';
import { match, navigate, useRoute } from './router.js';

import Login from './pages/auth/Login.jsx';
import Intro, { INTRO_SEEN } from './pages/auth/Intro.jsx';
import { load } from './lib/storage.js';
import Icon from './components/Icon.jsx';
import Signup from './pages/auth/Signup.jsx';
import FindId from './pages/auth/FindId.jsx';
import FindPassword from './pages/auth/FindPassword.jsx';
import Home from './pages/Home.jsx';
import Alarm from './pages/Alarm.jsx';
import MedList from './pages/meds/MedList.jsx';
import MedEdit from './pages/meds/MedEdit.jsx';
import MedTimes from './pages/meds/MedTimes.jsx';
import History from './pages/History.jsx';
import Settings from './pages/settings/Settings.jsx';
import NotifySettings from './pages/settings/NotifySettings.jsx';
import Profile from './pages/settings/Profile.jsx';
import Account from './pages/settings/Account.jsx';
import Display from './pages/settings/Display.jsx';

const AUTH_PATHS = ['/intro', '/login', '/signup', '/find-id', '/find-password'];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15 * 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function App() {
  const path = useRoute();
  const clock = useClock();
  const today = dateKey(clock);
  const now = nowMinutes(clock);

  const [user, setUser] = useState(undefined); // undefined = 확인 중
  const [data, setData] = useState(null);
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const loadedFor = useRef(null);
  const synced = useRef(null); // 마지막으로 서버와 맞춘 데이터

  // 처음 열 때 로그인 상태 확인 (자동 로그인, 간편 로그인에서 돌아온 경우 포함)
  useEffect(() => {
    api.currentUser().then(setUser, () => setUser(null));
  }, []);

  // 로그인한 사람의 데이터 불러오기
  useEffect(() => {
    if (!user) {
      setData(null);
      loadedFor.current = null;
      synced.current = null;
      return;
    }
    setLoadError(false);
    api.loadData(user.id).then(
      (d) => {
        loadedFor.current = user.id;
        synced.current = d;
        setData(d);
      },
      () => setLoadError(true),
    );
  }, [user?.id, reloadKey]);

  // 바뀐 부분만 저장 (Supabase 또는 체험 모드는 기기 저장소)
  useEffect(() => {
    if (!user || !data || loadedFor.current !== user.id) return;
    const prev = synced.current;
    synced.current = data;
    if (!prev || prev === data) return;
    api.syncData(user.id, prev, data).catch(() => setToast('저장하지 못했어요. 인터넷 연결을 확인해 주세요'));
  }, [data, user]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // 로그인 여부에 맞게 화면 이동
  useEffect(() => {
    if (user === undefined) return;
    const isAuth = AUTH_PATHS.includes(path);
    if (!user && !isAuth) navigate(load(INTRO_SEEN, false) ? '/login' : '/intro', { replace: true });
    if (user && (isAuth || path === '/')) navigate('/home', { replace: true });
  }, [user, path]);

  const update = useCallback((fn) => setData((d) => (d ? fn(d) : d)), []);

  // 해당 시간의 약을 모두 먹은 것으로 기록
  const takeSlot = useCallback(
    (minutes, keyOfDay = today) => {
      update((d) => {
        const slot = slotsOn(d.meds, d.logs, keyOfDay).find((s) => s.minutes === minutes);
        if (!slot) return d;
        const day = { ...(d.logs[keyOfDay] || {}) };
        const at = new Date().toISOString();
        slot.items.forEach((i) => {
          if (!day[i.key]) day[i.key] = at;
        });
        return { ...d, logs: { ...d.logs, [keyOfDay]: day } };
      });
      setToast('잘하셨어요! 기록했어요');
    },
    [today, update],
  );

  // 약 하나만 먹은 것으로 기록
  const takeDose = useCallback(
    (doseKeyStr, keyOfDay = today) => {
      update((d) => {
        const day = { ...(d.logs[keyOfDay] || {}) };
        if (!day[doseKeyStr]) day[doseKeyStr] = new Date().toISOString();
        return { ...d, logs: { ...d.logs, [keyOfDay]: day } };
      });
    },
    [today, update],
  );

  // 기록 취소 (잘못 눌렀을 때)
  const untakeDose = useCallback(
    (doseKeyStr, keyOfDay = today) => {
      update((d) => {
        const day = { ...(d.logs[keyOfDay] || {}) };
        delete day[doseKeyStr];
        return { ...d, logs: { ...d.logs, [keyOfDay]: day } };
      });
      setToast('기록을 취소했어요');
    },
    [today, update],
  );

  // ───── 복용 알림: 앱이 열려 있는 동안 1분마다 확인 ─────
  const fired = useRef(new Set());
  const [snoozeAt, setSnoozeAt] = useState(null); // { minutes, at }
  useEffect(() => {
    if (!user || !data || !data.settings.notify) return;
    const slots = slotsOn(data.meds, data.logs, today);
    const fire = (slot, tag, again) => {
      const id = `${today}|${slot.minutes}|${tag}`;
      if (fired.current.has(id)) return;
      fired.current.add(id);
      const names = slot.items.filter((i) => !i.taken).map((i) => i.med.name).join(', ');
      if (canNotify()) {
        showNotification(`${slot.label} 약 드실 시간이에요${again ? ' (다시 알림)' : ''}`, {
          body: `${formatTime(slot.minutes)} · ${names}`,
          tag: id,
          onClick: () => navigate(`/alarm/${slot.minutes}`),
        });
      }
      if (!path.startsWith('/alarm')) navigate(`/alarm/${slot.minutes}`);
    };
    slots.forEach((s) => {
      if (s.taken) return;
      if (now === s.minutes) fire(s, 'on', false);
      if (data.settings.remind && now === s.minutes + data.settings.remindMinutes) fire(s, 'remind', true);
      if (snoozeAt && snoozeAt.minutes === s.minutes && now >= snoozeAt.at) {
        setSnoozeAt(null);
        fire(s, `snooze${snoozeAt.at}`, true);
      }
    });
  }, [now, today, user, data, snoozeAt, path]);

  if (user && loadError) {
    return (
      <div className="phone splash" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
        <span>약속</span>
        <p className="sub">기록을 불러오지 못했어요.<br />인터넷 연결을 확인해 주세요.</p>
        <button type="button" className="btn-primary" style={{ maxWidth: 280 }} onClick={() => setReloadKey((k) => k + 1)}>
          다시 시도
        </button>
      </div>
    );
  }

  if (user === undefined || (user && !data)) {
    return (
      <div className="phone splash" aria-label="약속 불러오는 중">
        <span className="splash-logo">
          <Icon name="pill" size={34} color="#fff" strokeWidth={2.4} />
        </span>
        <b>약속</b>
        <small>약 먹을 시간을 챙겨 드려요</small>
      </div>
    );
  }

  const ctx = {
    user,
    setUser,
    data,
    update,
    today,
    now,
    takeSlot,
    takeDose,
    untakeDose,
    toast: setToast,
    snooze: (minutes) => {
      const mins = data.settings.remindMinutes || 10;
      setSnoozeAt({ minutes, at: now + mins });
      setToast(`${mins}분 뒤에 다시 알려드릴게요`);
    },
  };

  let page = null;
  let params;
  if (!user) {
    if (path === '/intro') page = <Intro />;
    else if (path === '/signup') page = <Signup ctx={ctx} />;
    else if (path === '/find-id') page = <FindId />;
    else if (path === '/find-password') page = <FindPassword ctx={ctx} />;
    else page = <Login ctx={ctx} />;
  } else if (path === '/home') page = <Home ctx={ctx} />;
  else if ((params = match('/alarm/:minutes', path))) page = <Alarm ctx={ctx} minutes={Number(params.minutes)} />;
  else if (path === '/meds') page = <MedList ctx={ctx} />;
  else if (path === '/meds/new') page = <MedEdit ctx={ctx} />;
  else if ((params = match('/meds/:id/times', path))) page = <MedTimes key={params.id} ctx={ctx} id={params.id} />;
  else if ((params = match('/meds/:id', path))) page = <MedEdit key={params.id} ctx={ctx} id={params.id} />;
  else if (path === '/history') page = <History ctx={ctx} />;
  else if (path === '/settings') page = <Settings ctx={ctx} />;
  else if (path === '/settings/notify') page = <NotifySettings ctx={ctx} />;
  else if (path === '/settings/profile') page = <Profile ctx={ctx} />;
  else if (path === '/settings/account') page = <Account ctx={ctx} />;
  else if (path === '/settings/display') page = <Display ctx={ctx} />;
  else page = <Home ctx={ctx} />;

  return (
    <div className="phone">
      {page}
      <DialogHost />
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
