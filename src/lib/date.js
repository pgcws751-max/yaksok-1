export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n) => String(n).padStart(2, '0');

// Date → "2026-11-13"
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-11-13" → Date (그 날 0시)
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function weekdayOf(key) {
  return parseKey(key).getDay();
}

// "11월 13일 금요일"
export function dateLabel(key) {
  const d = parseKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

// "11월 13일"
export function shortLabel(key) {
  const d = parseKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function nowMinutes(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

// 이번 주 월요일
export function weekStart(key) {
  const wd = weekdayOf(key);
  return addDays(key, wd === 0 ? -6 : 1 - wd);
}

export function monthStart(key) {
  return `${key.slice(0, 7)}-01`;
}

export function monthEnd(key) {
  const d = parseKey(monthStart(key));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return dateKey(d);
}
