// ─────────────────────────────────────────────────────────────
// 약속 도우미 — 복약 · 약국/병원 찾기 · 가족 전화 · 긴급 도움을 돕는 종합 도우미
// 지금은 "샘플" 답변만 합니다 (실제 AI 연결 없음).
//   - 약국/병원 목록: 샘플 이름 (지도 버튼은 실제 카카오맵 검색)
//   - 전화 걸기/문자/119: 실제로 동작 (tel:, sms:)
//
// 나중에 AI를 붙일 때:
//  1) SYSTEM_PROMPT 에 아이디어를 프롬프트로 적습니다.
//  2) TOOLS 에 적힌 기능(약국 찾기, 전화 연결 등)을 AI가 고를 수 있게
//     서버 함수에서 "도구 호출(function calling)" 로 연결합니다.
//  3) getReply() 안의 샘플 부분을 서버 함수 호출로 바꿉니다.
//     AI 답이 { text, card, action } 모양이면 화면(Chat.jsx)은 그대로 씁니다.
// ─────────────────────────────────────────────────────────────
import { slotsOn, rateBetween, streakDays } from './schedule.js';
import { weekStart } from './date.js';
import { findContact, listContacts } from './contacts.js';
import { formatTime } from '../time.js';

// AI에게 줄 기본 지시문 (초안 — 자유롭게 고쳐 쓰세요)
export const SYSTEM_PROMPT = `너는 "약속" 앱의 생활 도우미야. 사용자는 주로 어르신과 그 가족이야.
[말투]
- 짧고 쉬운 존댓말, 한 번에 한 가지씩 안내해. 어려운 의학 용어는 쉬운 말로 바꿔.
[할 수 있는 일]
- 복약: 오늘 먹을 약, 놓친 약, 복용률을 회원 기록(context)으로 알려 줘.
- 약국·병원 찾기: 사용자의 위치 근처에서 찾아 주고, 영업 여부와 거리, 전화번호를 알려 줘.
- 연락: 등록된 가족·지인에게 전화나 문자를 연결해 줘. 전화를 걸기 전에 누구에게 거는지 확인해.
- 긴급: 가슴 통증, 숨이 참, 쓰러짐, 심한 출혈 같은 말이 나오면 다른 말보다 먼저 119 연결을 권해.
[하지 말 것]
- 약의 효과·부작용·병용 가능 여부 같은 의학적 판단은 하지 말고 의사·약사 상담을 안내해.
- 개인정보(연락처, 약 이름)를 다른 사람에게 말하지 마.
[마무리]
- 답 끝에 할 수 있는 다음 행동 하나를 버튼처럼 제안해.`;

// AI가 고를 수 있는 기능 목록 (나중에 function calling 으로 연결)
export const TOOLS = [
  { name: 'get_today_doses', desc: '오늘 먹을 약과 복용 여부' },
  { name: 'get_adherence', desc: '이번 주 복용률과 연속 복용일' },
  { name: 'find_places', desc: '내 주변 약국·병원 찾기 (종류, 진료과, 야간/휴일 여부)' },
  { name: 'call_contact', desc: '가족·지인에게 전화 걸기' },
  { name: 'send_sms', desc: '가족·지인에게 문자 보내기' },
  { name: 'call_emergency', desc: '119 긴급 전화' },
];

// 첫 화면 큰 버튼 (누르면 그 문장을 보낸 것처럼 동작)
export const SERVICES = [
  { icon: 'pill', label: '오늘 먹을 약', ask: '오늘 먹을 약 알려줘' },
  { icon: 'pharmacy', label: '약국 찾기', ask: '가까운 약국 찾아줘' },
  { icon: 'hospital', label: '병원 찾기', ask: '가까운 병원 찾아줘' },
  { icon: 'phone', label: '가족에게 전화', ask: '가족에게 전화하고 싶어요' },
  { icon: 'siren', label: '긴급 도움', ask: '긴급 도움이 필요해요' },
  { icon: 'chart', label: '복용 기록', ask: '이번 주 복용률 어때요?' },
];

export const SUGGESTIONS = ['지금 문 연 약국', '내과 찾아줘', '딸에게 전화해줘', '약 먹는 걸 깜빡했어요', '식후 30분은 언제예요?'];

export const GREETING = {
  role: 'bot',
  text: '안녕하세요! 약속 도우미예요.\n약 챙기기, 약국·병원 찾기, 가족에게 전화까지 도와 드릴게요. 아래 버튼을 누르거나 편하게 말씀해 주세요.',
  card: { type: 'services' },
};

export const mapSearch = (q) => `https://map.kakao.com/link/search/${encodeURIComponent(q)}`;

// AI에게 함께 보낼 "내 기록 요약"
export function buildContext({ data, today, now, user }) {
  const slots = slotsOn(data.meds, data.logs, today);
  const ws = weekStart(today);
  return {
    userId: user?.id,
    name: user?.name,
    today,
    now,
    slots: slots.map((s) => ({
      label: s.label,
      time: formatTime(s.minutes),
      minutes: s.minutes,
      items: s.items.map((i) => ({ name: i.med.name, dose: i.med.dose, taken: i.taken })),
      taken: s.taken,
    })),
    weekRate: rateBetween(data.meds, data.logs, ws, today, today, now),
    streak: streakDays(data.meds, data.logs, today, now),
    meds: data.meds.map((m) => m.name),
    contacts: listContacts(user?.id).map((c) => ({ name: c.name, relation: c.relation })),
  };
}

const has = (t, ...words) => words.some((w) => t.includes(w));
// 받침에 따라 "예요/이에요"
const ieyo = (word) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 === 0 ? `${word}예요` : `${word}이에요`;
};
const DEPTS = ['내과', '치과', '정형외과', '안과', '이비인후과', '피부과', '소아과', '소아청소년과', '한의원', '산부인과', '신경과', '비뇨기과', '가정의학과', '재활의학과'];

// 샘플 장소 목록 (실제 서비스에서는 위치 + 공공데이터/지도 API로 바꿉니다)
function samplePlaces(kind, dept, night) {
  if (kind === 'pharmacy') {
    return [
      { name: '행복약국', dist: '150m', open: night ? '오늘 밤 12시까지' : '영업 중 · 오후 9시까지' },
      { name: '미소온누리약국', dist: '320m', open: '영업 중 · 오후 8시까지' },
      { name: '건강한약국', dist: '580m', open: night ? '심야 운영 · 새벽 2시까지' : '영업 중 · 오후 10시까지' },
    ];
  }
  const d = dept || '의원';
  return [
    { name: `튼튼${dept || '가정의학과'}의원`, dist: '400m', open: '진료 중 · 오후 6시 30분까지', dept: d },
    { name: `바른${dept || '내과'}의원`, dist: '750m', open: '진료 중 · 점심시간 1~2시', dept: d },
    { name: `한마음${dept || '내과'}`, dist: '1.2km', open: '오늘 오후 7시까지', dept: d },
  ];
}

// 샘플 답변: { text, card?, action?, tone? }
export async function getReply(text, appCtx) {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500)); // "입력 중…" 보이기
  const c = buildContext(appCtx);
  const t = text.replace(/\s/g, '');

  // 1) 긴급
  if (has(t, '119', '긴급', '응급', '가슴', '숨이', '호흡', '쓰러', '의식', '피가')) {
    return {
      text: '위험할 수 있어요. 지금 바로 119에 연락하세요.\n가까운 응급실 위치도 확인할 수 있어요.',
      tone: 'warn',
      card: { type: 'emergency', map: mapSearch('응급실') },
    };
  }

  // 2) 전화 · 문자
  if (has(t, '전화', '연락', '통화', '문자')) {
    const who = findContact(c.userId, t);
    if (who) {
      return {
        text: `${who.name}님(${who.relation})에게 연결할게요. 아래 버튼을 눌러 주세요.`,
        card: { type: 'contact', contact: who, sms: has(t, '문자') },
      };
    }
    if (!c.contacts.length) {
      return {
        text: '아직 등록된 가족·지인 연락처가 없어요.\n설정에서 연락처를 넣어 두시면 "딸에게 전화해줘"처럼 말씀만 하셔도 연결해 드려요.',
        action: { label: '연락처 등록하기', path: '/settings/contacts' },
      };
    }
    return { text: '누구에게 연락할까요? 아래에서 골라 주세요.', card: { type: 'contacts', list: listContacts(c.userId) } };
  }

  // 3) 약국 · 병원 찾기
  const dept = DEPTS.find((d) => t.includes(d));
  const night = has(t, '지금', '야간', '심야', '밤', '휴일', '주말', '문연');
  if (has(t, '약국')) {
    const q = night ? '심야약국' : '약국';
    return {
      text: night ? '지금 문 연 약국이에요. 가기 전에 전화로 한 번 확인해 보세요.' : '가까운 약국이에요. 영업시간은 바뀔 수 있으니 확인해 보세요.',
      card: { type: 'places', kind: 'pharmacy', title: night ? '지금 문 연 약국' : '가까운 약국', items: samplePlaces('pharmacy', null, night), map: mapSearch(q), mapLabel: `카카오맵에서 내 주변 ${q} 찾기` },
    };
  }
  if (dept || has(t, '병원', '의원', '진료')) {
    const q = dept || '병원';
    return {
      text: `가까운 ${ieyo(q)}. 처음 가시는 곳이면 진료 시간과 예약 여부를 전화로 확인해 보세요.`,
      card: { type: 'places', kind: 'hospital', title: `가까운 ${q}`, items: samplePlaces('hospital', dept, night), map: mapSearch(q), mapLabel: `카카오맵에서 내 주변 ${q} 찾기` },
    };
  }

  // 4) 복약
  if (has(t, '오늘', '먹을약', '남은약', '뭐먹')) {
    if (!c.slots.length) return { text: '오늘은 드실 약이 없어요. 편안한 하루 보내세요!' };
    const left = c.slots.filter((s) => !s.taken);
    return {
      text: left.length
        ? `오늘 남은 약은 ${left.length}번이에요. 다음은 ${left[0].label}(${left[0].time})이에요.`
        : '오늘 약을 모두 드셨어요. 정말 잘하셨어요!',
      card: { type: 'today', slots: c.slots },
      action: { label: '홈에서 체크하기', path: '/home' },
    };
  }
  if (has(t, '깜빡', '잊', '놓쳤', '못먹')) {
    return {
      text:
        '생각났을 때 바로 드시는 게 좋은 약이 많지만, 다음 복용 시간이 가까우면 건너뛰어야 하는 약도 있어요.\n' +
        '약마다 다르니 약 봉투의 안내를 확인하시거나 약사에게 물어보세요. 두 번 분량을 한꺼번에 드시면 안 돼요.',
      action: { label: '가까운 약국 찾기', ask: '가까운 약국 찾아줘' },
    };
  }
  if (has(t, '복용률', '잘먹', '기록', '이번주')) {
    const r = c.weekRate;
    return {
      text:
        r.percent == null
          ? '아직 이번 주 기록이 없어요. 약을 체크하면 복용률을 알려 드릴게요.'
          : `이번 주에는 ${r.due}번 중 ${r.taken}번 드셨어요. ${r.percent >= 80 ? '아주 잘하고 계세요!' : '조금만 더 힘내 봐요!'}`,
      card: { type: 'rate', percent: r.percent, taken: r.taken, due: r.due, streak: c.streak },
      action: { label: '복용률 자세히 보기', path: '/history' },
    };
  }
  if (has(t, '식후', '식전', '30분')) {
    return {
      text: '"식후 30분"은 식사를 마치고 30분쯤 지났을 때예요. 예를 들어 12시에 점심을 다 드셨다면 12시 30분쯤 드시면 돼요.\n식전은 보통 식사 30분 전이에요.',
      action: { label: '복용시간 바꾸기', path: '/meds' },
    };
  }
  if (has(t, '같이', '함께', '부작용', '효과', '술', '음식')) {
    return {
      text: `약을 함께 먹어도 되는지, 부작용이나 음식과의 관계는 꼭 의사나 약사에게 확인해 주세요.${c.meds.length ? `\n상담하실 때 지금 드시는 약(${c.meds.join(', ')})을 알려 주시면 좋아요.` : ''}`,
      tone: 'info',
      action: { label: '가까운 약국 찾기', ask: '가까운 약국 찾아줘' },
    };
  }

  // 5) 메뉴 · 인사
  if (has(t, '메뉴', '뭐할수', '도움', '기능')) {
    return { text: '이런 일을 도와 드릴 수 있어요.', card: { type: 'services' } };
  }
  if (has(t, '안녕', '고마', '감사')) {
    return { text: `${c.name ? `${c.name}님, ` : ''}언제든 편하게 불러 주세요. 오늘도 약속을 지켜요!` };
  }

  return {
    text: '지금은 샘플이라 정해진 질문에만 답할 수 있어요.\n아래 버튼을 눌러 보세요. 나중에 AI가 연결되면 무엇이든 물어볼 수 있어요.',
    card: { type: 'services' },
  };
}
