import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from './lib/api.js';
import { dateKey, nowMinutes } from './lib/date.js';
import { slotsOn } from './lib/schedule.js';
import { canNotify, showNotification } from './lib/notify.js';
import { formatTime } from './time.js';
import { match, navigate, useRoute } from './router.js';

import Login from './pages/auth/Login.jsx';
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

const AUTH_PATHS = ['/login', '/signup', '/find-id', '/find-password'];

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
  const loadedFor = useRef(null);

  // 처음 열 때 로그인 상태 확인 (자동 로그인)
  useEffect(() => {
    api.currentUser().then(setUser);
  }, []);

  // 로그인한 사람의 데이터 불러오기
  useEffect(() => {
    if (!user) {
      setData(null);
      loadedFor.current = null;
      return;
    }
    api.loadData(user.id).then((d) => {
      loadedFor.current = user.id;
      setData(d);
    });
  }, [user?.id]);

  // 바뀐 데이터 저장
  useEffect(() => {
    if (user && data && loadedFor.current === user.id) api.saveData(user.id, data);
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
    if (!user && !isAuth) navigate('/login', { replace: true });
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

  if (user === undefined || (user && !data)) {
    return <div className="phone splash">약속</div>;
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
    if (path === '/signup') page = <Signup ctx={ctx} />;
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
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
