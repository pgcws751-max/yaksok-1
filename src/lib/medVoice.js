// ─────────────────────────────────────────────────────────────
// 말로 약 등록하기: "혈압약 아침 저녁 한 알씩 식후 오늘부터 한 달" → 등록 정보
// 알아들은 항목만 돌려줍니다. (못 알아들은 항목은 화면에서 고르면 돼요)
// ─────────────────────────────────────────────────────────────
import { addDays } from './date.js';

export const SLOTS = [
  { id: 'morning', label: '아침', icon: 'sunrise', minutes: 8 * 60 },
  { id: 'lunch', label: '점심', icon: 'sun', minutes: 12 * 60 + 30 },
  { id: 'dinner', label: '저녁', icon: 'moon', minutes: 18 * 60 + 30 },
  { id: 'bed', label: '자기 전', icon: 'moon', minutes: 21 * 60 + 30 },
];

export const DOSES = ['반 알', '1알', '2알', '3알', '1포', '1캡슐'];

export const COMMON_MEDS = ['혈압약', '당뇨약', '고지혈증약', '갑상선약', '위장약', '관절약', '비타민D', '유산균', '오메가3', '칼슘'];

export const DURATIONS = [
  { id: 'ongoing', label: '계속', days: null },
  { id: '7', label: '1주', days: 7 },
  { id: '14', label: '2주', days: 14 },
  { id: '30', label: '1달', days: 30 },
  { id: '90', label: '3달', days: 90 },
];

// 음성 인식이 없는 환경에서 보여 줄 예시 문장
export const MED_VOICE_SAMPLES = ['혈압약 아침 저녁 한 알씩 식후 오늘부터 계속', '당뇨약 아침 점심 저녁 식전 한 알 내일부터 한 달', '비타민D 아침에 한 알 오늘부터 두 달'];

const NUM = { 한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 };
const toNum = (w) => (/^\d+$/.test(w) ? Number(w) : NUM[w] ?? null);
const NUMW = '(\\d+|한|하나|두|둘|세|셋|네|넷|다섯|여섯|일곱|여덟|아홉|열)';

export function parseMedSpeech(text, today) {
  const raw = ` ${text} `;
  const t = text.replace(/\s/g, '');
  const out = {};

  // 시간대
  const slots = new Set();
  if (/아침|오전/.test(t)) slots.add('morning');
  if (/점심|낮/.test(t)) slots.add('lunch');
  if (/저녁|오후/.test(t)) slots.add('dinner');
  if (/자기전|잠자기|취침|잘때|밤/.test(t)) slots.add('bed');
  const perDay = t.match(new RegExp(`하루(에)?${NUMW}번`));
  if (!slots.size && perDay) {
    const n = toNum(perDay[2]);
    if (n === 1) slots.add('morning');
    if (n === 2) ['morning', 'dinner'].forEach((x) => slots.add(x));
    if (n >= 3) ['morning', 'lunch', 'dinner'].forEach((x) => slots.add(x));
    if (n >= 4) slots.add('bed');
  }
  if (slots.size) out.slots = SLOTS.filter((s) => slots.has(s.id)).map((s) => s.id);

  // 용량
  if (/반알|반정|반개/.test(t)) out.dose = '반 알';
  else {
    const m = t.match(new RegExp(`${NUMW}(알|정|개|포|캡슐)`));
    if (m) {
      const n = toNum(m[1]) || 1;
      const unit = m[2] === '포' ? '포' : m[2] === '캡슐' ? '캡슐' : '알';
      out.dose = `${n}${unit}`;
    }
  }

  // 식사
  if (/식전|밥먹기전|식사전/.test(t)) out.meal = 'before';
  else if (/식후|밥먹고|식사후|밥먹은후/.test(t)) out.meal = 'after';
  else if (/상관없|아무때|공복상관/.test(t)) out.meal = 'any';

  // 시작일
  if (/오늘부터|오늘/.test(t)) out.startDate = today;
  else if (/내일부터|내일/.test(t)) out.startDate = addDays(today, 1);
  else if (/모레부터|모레/.test(t)) out.startDate = addDays(today, 2);
  else {
    const d = t.match(/(\d{1,2})일부터/);
    if (d) {
      const day = Number(d[1]);
      const [y, mo] = today.split('-').map(Number);
      let key = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (key < today) {
        const nm = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
        key = `${nm}-${String(day).padStart(2, '0')}`;
      }
      out.startDate = key;
    }
  }

  // 기간
  if (/계속|꾸준히|평생|매일계속|끝없이/.test(t)) out.duration = 'ongoing';
  else if (/보름/.test(t)) out.durationDays = 15;
  else if (/일주일|한주/.test(t)) out.durationDays = 7;
  else {
    // "26일부터" 같은 시작 날짜는 건너뛰고 기간만 찾기
    for (const m of t.matchAll(new RegExp(`${NUMW}(일|주일|주|달|개월)`, 'g'))) {
      if (t.slice(m.index + m[0].length).startsWith('부터')) continue;
      const n = toNum(m[1]);
      if (!n) continue;
      out.durationDays = m[2] === '일' ? n : m[2].startsWith('주') ? n * 7 : n * 30;
      break;
    }
  }

  // 약 이름: 아는 이름 → "○○약/○○제" → 남은 첫 단어
  const known = [...COMMON_MEDS, '콜레스테롤약', '고혈압약', '소화제', '진통제', '감기약', '철분제', '아스피린', '골다공증약', '비타민', '마그네슘', '수면제', '변비약', '안약']
    .sort((a, b) => b.length - a.length)
    .find((n) => t.includes(n.replace(/\s/g, '')));
  if (known) out.name = known;
  else {
    const m = raw.match(/([가-힣A-Za-z0-9]+(?:약|제|정|캡슐))(?=[\s은는이가을를도]|$)/);
    const STOP = /^(아침|점심|저녁|하루|식전|식후|오늘|내일|모레|한|두|세|반)/;
    if (m && !STOP.test(m[1]) && !/^\d/.test(m[1])) out.name = m[1];
    else {
      const first = text.trim().split(/\s+/)[0] || '';
      const cleaned = first.replace(/(은|는|이|가|을|를|도)$/, '');
      if (cleaned && !STOP.test(cleaned) && cleaned.length <= 15) out.name = cleaned;
    }
  }
  return out;
}

// 알아들은 내용을 한 줄로 (예: "혈압약 · 아침, 저녁 · 1알 · 식후")
export function describeParsed(p) {
  const parts = [];
  if (p.name) parts.push(p.name);
  if (p.slots) parts.push(p.slots.map((id) => SLOTS.find((s) => s.id === id).label).join(', '));
  if (p.dose) parts.push(p.dose);
  if (p.meal) parts.push({ before: '식전', after: '식후', any: '식사 상관없음' }[p.meal]);
  if (p.startDate) parts.push(`${Number(p.startDate.slice(5, 7))}월 ${Number(p.startDate.slice(8))}일부터`);
  if (p.duration === 'ongoing') parts.push('계속');
  if (p.durationDays) parts.push(`${p.durationDays}일 동안`);
  return parts.join(' · ');
}
