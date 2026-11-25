// 약 목록 + 복용 기록으로 "그날 먹을 약", "복용 여부", "복용률"을 계산합니다.
import { addDays, weekdayOf } from './date.js';
import { slotLabel } from '../time.js';

export const doseKey = (medId, minutes) => `${medId}@${minutes}`;

export function isActiveOn(med, key) {
  if (key < med.startDate) return false;
  if (med.endDate && key > med.endDate) return false;
  return med.days.includes(weekdayOf(key));
}

// 그날 복용할 약을 시간별로 묶어서 돌려줍니다.
// [{ minutes, label, icon, items: [{ key, med, taken, takenAt }], taken }]
export function slotsOn(meds, logs, key) {
  const dayLog = logs[key] || {};
  const map = new Map();
  meds.forEach((med) => {
    if (!isActiveOn(med, key)) return;
    med.times.forEach((t) => {
      const k = doseKey(med.id, t);
      if (!map.has(t)) map.set(t, []);
      map.get(t).push({ key: k, med, taken: !!dayLog[k], takenAt: dayLog[k] || null });
    });
  });
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([minutes, items]) => ({
      minutes,
      ...slotLabel(minutes),
      items,
      taken: items.every((i) => i.taken),
    }));
}

// 복용해야 했던 횟수(due)와 드신 횟수(taken)
// 오늘은 지금 시각까지 시간이 된 약만 셉니다. (미리 드신 약은 포함)
export function countOn(meds, logs, key, todayKey, now) {
  if (key > todayKey) return { due: 0, taken: 0 };
  let due = 0;
  let taken = 0;
  slotsOn(meds, logs, key).forEach((s) => {
    s.items.forEach((i) => {
      const isDue = key < todayKey || s.minutes <= now || i.taken;
      if (!isDue) return;
      due += 1;
      if (i.taken) taken += 1;
    });
  });
  return { due, taken };
}

// none: 먹을 약 없음 / future: 아직 / done: 모두 드심 / partial: 일부 / missed: 하나도 안 드심 / today: 오늘(진행 중)
export function dayStatus(meds, logs, key, todayKey, now) {
  const total = slotsOn(meds, logs, key).reduce((n, s) => n + s.items.length, 0);
  if (!total) return 'none';
  if (key > todayKey) return 'future';
  const { due, taken } = countOn(meds, logs, key, todayKey, now);
  if (key === todayKey) {
    if (due && taken < due) return 'partial';
    return taken === total ? 'done' : 'today';
  }
  if (taken === due) return 'done';
  return taken ? 'partial' : 'missed';
}

export function rateBetween(meds, logs, from, to, todayKey, now) {
  let due = 0;
  let taken = 0;
  for (let k = from; k <= to && k <= todayKey; k = addDays(k, 1)) {
    const c = countOn(meds, logs, k, todayKey, now);
    due += c.due;
    taken += c.taken;
  }
  return { due, taken, percent: due ? Math.round((taken / due) * 100) : null };
}

// 연속으로 약을 모두 드신 날 수 (오늘을 다 드셨으면 오늘 포함, 아니면 어제까지)
export function streakDays(meds, logs, todayKey, now) {
  let n = 0;
  let k = todayKey;
  const todaySt = dayStatus(meds, logs, todayKey, todayKey, now);
  if (todaySt !== 'done') k = addDays(todayKey, -1);
  for (let i = 0; i < 366; i += 1) {
    const st = dayStatus(meds, logs, k, todayKey, now);
    if (st === 'done') n += 1;
    else if (st !== 'none') break;
    k = addDays(k, -1);
    if (!meds.some((m) => m.startDate <= k)) break;
  }
  return n;
}

// 기간 안에 놓친 횟수
export function missedBetween(meds, logs, from, to, todayKey, now) {
  const r = rateBetween(meds, logs, from, to, todayKey, now);
  return r.due - r.taken;
}
