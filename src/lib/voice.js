// ─────────────────────────────────────────────────────────────
// 음성 도우미
//  - 말하기(음성 인식): 지금은 "샘플" — 예시 문장을 돌아가며 받아 적는 모습만 보여 줍니다.
//    나중에 실제로 연결할 때는 listen() 안을 바꾸면 됩니다.
//    예) 브라우저 SpeechRecognition(lang 'ko-KR'), 또는 녹음 → 서버의 음성 인식 API
//  - 듣기(읽어 주기): 휴대폰에 들어 있는 읽기 기능(speechSynthesis)을 실제로 씁니다.
// ─────────────────────────────────────────────────────────────

export const VOICE_SAMPLES = ['오늘 먹을 약 알려줘', '가까운 약국 찾아줘', '딸에게 전화해줘', '내과 찾아줘', '이번 주 복용률 어때요?'];

let sampleIdx = 0;

// 샘플 받아 적기: onText(지금까지 들은 글자) 를 여러 번 부르고, 끝나면 전체 문장을 돌려줍니다.
// signal.aborted 가 되면 멈춥니다.
export async function listen({ onText, signal }) {
  const phrase = VOICE_SAMPLES[sampleIdx++ % VOICE_SAMPLES.length];
  await wait(900, signal); // "듣고 있어요…" 잠깐
  for (let i = 1; i <= phrase.length; i += 1) {
    if (signal?.aborted) return null;
    onText(phrase.slice(0, i));
    await wait(phrase[i - 1] === ' ' ? 60 : 110, signal);
  }
  await wait(600, signal);
  return signal?.aborted ? null : phrase;
}

function wait(ms, signal) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

// ───── 읽어 주기 ─────

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export function speak(text, { onEnd } = {}) {
  if (!canSpeak()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\n/g, ' '));
  u.lang = 'ko-KR';
  u.rate = 0.9; // 어르신을 위해 조금 천천히
  const ko = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith('ko'));
  if (ko) u.voice = ko;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
