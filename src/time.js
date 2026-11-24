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
  if (diff <= 0) return '지금 드실 시간';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h && m) return `${h}시간 ${m}분 뒤`;
  if (h) return `${h}시간 뒤`;
  return `${m}분 뒤`;
}

// 시각에 맞는 시간대 이름과 아이콘
export function slotLabel(minutes) {
  const h = Math.floor(minutes / 60);
  if (h < 5) return { label: '새벽', icon: 'moon' };
  if (h < 11) return { label: '아침', icon: 'sunrise' };
  if (h < 14) return { label: '점심', icon: 'sun' };
  if (h < 17) return { label: '오후', icon: 'sun' };
  if (h < 21) return { label: '저녁', icon: 'moon' };
  return { label: '자기 전', icon: 'moon' };
}

export const MEAL_TEXT = { before: '식전', after: '식후', any: '' };

export function doseText(med) {
  return `${med.name} ${med.dose}`;
}
