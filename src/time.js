// 분(0~1439)을 "오전 7:30", "낮 12:30", "오후 6:30" 형태로 바꿉니다.
export function formatTime(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  if (h < 12) return `오전 ${h === 0 ? 12 : h}:${mm}`;
  if (h === 12) return `낮 12:${mm}`;
  return `오후 ${h - 12}:${mm}`;
}

// 시간대 글자와 숫자를 나눠서 돌려줍니다. (알림 화면의 큰 숫자용)
export function splitTime(minutes) {
  const [period, clock] = formatTime(minutes).split(' ');
  return { period, clock };
}

// "30분 뒤", "1시간 10분 뒤"
export function formatUntil(diff) {
  if (diff <= 0) return '지금';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h && m) return `${h}시간 ${m}분 뒤`;
  if (h) return `${h}시간 뒤`;
  return `${m}분 뒤`;
}

export function pillSummary(pills) {
  return pills.map((p) => `${p.name} ${p.count}알`).join(' · ');
}

export const TODAY_LABEL = '11월 13일 금요일';
