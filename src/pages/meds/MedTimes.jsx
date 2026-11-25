import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, SubHeader } from '../../components/ui.jsx';
import { WEEKDAYS } from '../../lib/date.js';
import { navigate } from '../../router.js';
import { formatTime, slotLabel } from '../../time.js';

const STEP = 10;
const DEFAULT_TIMES = [8 * 60, 12 * 60 + 30, 18 * 60 + 30, 21 * 60 + 30];
const PRESETS = { 1: [8 * 60], 2: [8 * 60, 18 * 60 + 30], 3: [8 * 60, 12 * 60 + 30, 18 * 60 + 30], 4: DEFAULT_TIMES };
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MEALS = [
  { id: 'before', label: '식전' },
  { id: 'after', label: '식후' },
  { id: 'any', label: '상관없음' },
];
const ICON_COLOR = { sunrise: '#A64B0B', sun: '#A64B0B', moon: '#3B4A8C' };

export default function MedTimes({ ctx, id }) {
  const { data, update, toast } = ctx;
  const med = data.meds.find((m) => m.id === id);
  const [times, setTimes] = useState(() => [...(med?.times ?? [])].sort((a, b) => a - b));
  const [days, setDays] = useState(() => med?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [meal, setMeal] = useState(() => med?.meal ?? 'after');
  const [error, setError] = useState('');

  if (!med) {
    return (
      <main className="screen">
        <SubHeader title="약을 찾을 수 없어요" back="/meds" />
      </main>
    );
  }

  const setCount = (n) => {
    if (n === times.length) return;
    setTimes(n < times.length ? times.slice(0, n) : PRESETS[n]);
  };
  const shift = (idx, delta) => setTimes(times.map((t, i) => (i === idx ? (t + delta + 1440) % 1440 : t)));
  const toggleDay = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);

  const save = () => {
    if (!days.length) return setError('먹는 요일을 하루 이상 골라 주세요');
    const sorted = [...new Set(times)].sort((a, b) => a - b);
    if (sorted.length !== times.length) return setError('같은 시간이 두 번 있어요. 시간을 바꿔 주세요');
    update((d) => ({ ...d, meds: d.meds.map((m) => (m.id === id ? { ...m, times: sorted, days, meal } : m)) }));
    toast(`${med.name} 복용시간을 저장했어요`);
    navigate('/meds', { replace: true });
  };

  return (
    <main className="screen">
      <SubHeader title="복용시간 설정" sub={`${med.name} ${med.dose}`} back="/meds" />

      <h2 className="section-title">하루 몇 번 드세요?</h2>
      <div className="seg" role="group" aria-label="하루 횟수">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} type="button" aria-pressed={times.length === n} onClick={() => setCount(n)}>
            {n}번
          </button>
        ))}
      </div>

      <div className="set-list">
        {times.map((t, idx) => {
          const { label, icon } = slotLabel(t);
          return (
            <section key={idx} className="card set" aria-label={`${idx + 1}번째 시간`}>
              <div className="set-head">
                <Icon name={icon} size={22} color={ICON_COLOR[icon]} strokeWidth={2.2} />
                <span className="label">{label}</span>
                <span className="set-no">{idx + 1}번째</span>
              </div>
              <div className="stepper">
                <button type="button" className="round" aria-label={`${STEP}분 빠르게`} onClick={() => shift(idx, -STEP)}>
                  <Icon name="minus" size={20} />
                </button>
                <output aria-live="polite">{formatTime(t)}</output>
                <button type="button" className="round" aria-label={`${STEP}분 늦게`} onClick={() => shift(idx, STEP)}>
                  <Icon name="plus" size={20} />
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <h2 className="section-title">드시는 요일</h2>
      <div className="pad">
        <div className="days-pick">
          {WEEK_ORDER.map((d) => (
            <button key={d} type="button" aria-pressed={days.includes(d)} aria-label={`${WEEKDAYS[d]}요일`} onClick={() => toggleDay(d)}>
              {WEEKDAYS[d]}
            </button>
          ))}
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          <button type="button" className="chip-opt" onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}>매일</button>
          <button type="button" className="chip-opt" onClick={() => setDays([1, 2, 3, 4, 5])}>평일만</button>
          <button type="button" className="chip-opt" onClick={() => setDays([0, 6])}>주말만</button>
        </div>
      </div>

      <h2 className="section-title">식사와 함께</h2>
      <div className="seg" role="group" aria-label="식전 식후">
        {MEALS.map((m) => (
          <button key={m.id} type="button" aria-pressed={meal === m.id} onClick={() => setMeal(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="pad" style={{ marginTop: 14 }}>
        <ErrorBox message={error} />
      </div>
      <div className="save-wrap">
        <button type="button" className="btn-primary" onClick={save}>
          저장하기
        </button>
      </div>
    </main>
  );
}
