import { useEffect, useMemo, useState } from 'react';
import { INITIAL_SLOTS } from './data.js';
import Home from './pages/Home.jsx';
import Alarm from './pages/Alarm.jsx';
import Schedule from './pages/Schedule.jsx';
import History from './pages/History.jsx';

// 시안과 같은 화면이 나오도록 "지금"을 낮 12:00으로 고정했습니다.
// 실제 서비스에서는 new Date() 기준으로 바꾸세요.
const NOW_MINUTES = 12 * 60;

export default function App() {
  const [page, setPage] = useState('home');
  const [slots, setSlots] = useState(INITIAL_SLOTS);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // 알림이 켜져 있고 아직 안 드신 첫 번째 약
  const nextSlot = useMemo(
    () => slots.find((s) => s.enabled && !s.taken) ?? null,
    [slots],
  );

  const takeSlot = (id) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, taken: true } : s)));
    setToast('잘하셨어요! 기록했어요');
  };

  const saveSchedule = (edited) => {
    // 시간·켜짐 상태만 반영하고, 복용 여부는 유지
    setSlots((prev) =>
      prev.map((s) => {
        const e = edited.find((x) => x.id === s.id);
        return e ? { ...s, minutes: e.minutes, enabled: e.enabled } : s;
      }),
    );
    setToast('약 드실 시간을 저장했어요');
  };

  const go = (p) => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  return (
    <div className="phone">
      {page === 'home' && (
        <Home
          slots={slots}
          nextSlot={nextSlot}
          now={NOW_MINUTES}
          onTake={takeSlot}
          onPreviewAlarm={() => go('alarm')}
          onNavigate={go}
        />
      )}
      {page === 'alarm' && (
        <Alarm
          slot={nextSlot}
          onTake={(id) => {
            takeSlot(id);
            go('home');
          }}
          onSnooze={() => {
            setToast('10분 뒤에 다시 알려드릴게요');
            go('home');
          }}
          onClose={() => go('home')}
        />
      )}
      {page === 'schedule' && (
        <Schedule slots={slots} onSave={saveSchedule} onBack={() => go('home')} onNavigate={go} />
      )}
      {page === 'history' && (
        <History
          slots={slots}
          onShare={() => setToast('가족에게 이번 주 기록을 보냈어요')}
          onNavigate={go}
        />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
