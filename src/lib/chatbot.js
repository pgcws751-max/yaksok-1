// ─────────────────────────────────────────────────────────────
// 약속 AI 도우미 — 지금은 "샘플" 답변만 합니다 (실제 AI 연결 없음)
//
// 나중에 AI를 붙일 때:
//  1) 아래 SYSTEM_PROMPT 에 아이디어를 프롬프트로 적습니다.
//  2) getReply() 안의 "샘플 답변" 부분을 서버 함수 호출로 바꿉니다.
//     예) Supabase Edge Function 'chat' 에 { system: SYSTEM_PROMPT, messages, context } 를 보내고
//         AI가 만든 답을 받아 { text } 로 돌려주기
//  3) buildContext() 가 만드는 "내 약·복용 기록 요약"을 함께 보내면
//     AI가 회원의 실제 기록을 보고 답할 수 있어요.
// 화면(Chat.jsx)은 getReply() 만 부르므로 고칠 필요가 없습니다.
// ─────────────────────────────────────────────────────────────
import { slotsOn, rateBetween, streakDays } from './schedule.js';
import { weekStart } from './date.js';
import { formatTime } from '../time.js';

// AI에게 줄 기본 지시문 (초안 — 자유롭게 고쳐 쓰세요)
export const SYSTEM_PROMPT = `너는 복약 관리 앱 "약속"의 AI 도우미야.
- 어르신도 이해하기 쉽게, 짧고 따뜻한 존댓말로 답해.
- 회원의 약 목록과 복용 기록(context)을 참고해서 오늘 먹을 약, 놓친 약, 복용률을 알려 줘.
- 약의 효과·부작용·함께 먹어도 되는지 같은 의학적 판단은 하지 말고, 의사나 약사와 상담하도록 안내해.
- 응급 증상(가슴 통증, 호흡 곤란, 의식 저하 등)을 말하면 바로 119에 연락하라고 안내해.
- 답 끝에 할 수 있는 다음 행동(예: "홈에서 체크하기")을 하나 제안해.`;

// 화면 아래 자주 묻는 질문 버튼
export const SUGGESTIONS = ['오늘 먹을 약 알려줘', '약 먹는 걸 깜빡했어요', '이번 주 복용률 어때요?', '식후 30분은 언제예요?', '이 약들 같이 먹어도 돼요?'];

export const GREETING = {
  role: 'bot',
  text: '안녕하세요! 약속 AI 도우미예요.\n오늘 먹을 약이나 복용 기록, 궁금한 점을 물어보세요.',
};

// AI에게 함께 보낼 "내 기록 요약" (지금은 샘플 카드 만들 때만 사용)
export function buildContext({ data, today, now, user }) {
  const slots = slotsOn(data.meds, data.logs, today);
  const ws = weekStart(today);
  return {
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
  };
}

const has = (t, ...words) => words.some((w) => t.includes(w));

// 샘플 답변: { text, card? } — card 는 화면에 보여 줄 작은 정보 카드
export async function getReply(text, appCtx) {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500)); // "입력 중…" 보이기
  const c = buildContext(appCtx);
  const t = text.replace(/\s/g, '');

  if (has(t, '119', '가슴', '숨', '호흡', '쓰러', '의식')) {
    return {
      text: '위험할 수 있는 증상이에요. 지금 바로 119에 연락하시거나 가까운 응급실로 가 주세요.',
      tone: 'warn',
    };
  }

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
      action: { label: '복용이력에서 기록하기', path: '/history' },
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
    };
  }

  if (has(t, '안녕', '고마', '감사')) {
    return { text: `${c.name ? `${c.name}님, ` : ''}언제든 편하게 물어보세요. 오늘도 약속을 지켜요!` };
  }

  return {
    text: '지금은 샘플 화면이라 정해진 질문에만 답할 수 있어요.\n아래 질문 버튼을 눌러 보세요. 나중에 AI가 연결되면 무엇이든 물어볼 수 있어요.',
  };
}
