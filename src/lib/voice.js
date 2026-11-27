// ─────────────────────────────────────────────────────────────
// 음성 도우미
//  - 말하기(음성 인식): 브라우저가 지원하면(휴대폰 크롬 등) 실제 한국어 음성 인식,
//    지원하지 않으면(안드로이드 앱 웹뷰 등) 예시 문장을 받아 적는 "샘플"로 동작합니다.
//    더 정확한 인식이 필요하면 listen() 안을 서버 음성 인식 API 호출로 바꾸면 됩니다.
//  - 듣기(읽어 주기): 휴대폰에 들어 있는 읽기 기능(speechSynthesis)을 실제로 씁니다.
// ─────────────────────────────────────────────────────────────

export const VOICE_SAMPLES = ['오늘 먹을 약 알려줘', '가까운 약국 찾아줘', '딸에게 전화해줘', '내과 찾아줘', '이번 주 복용률 어때요?'];


// 브라우저에 음성 인식이 있으면(휴대폰 크롬 등) 실제로 받아 적고, 없으면 샘플로 동작합니다.
export const canRecognize = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// onText(지금까지 들은 글자) 를 여러 번 부르고, 끝나면 전체 문장을 돌려줍니다.
// 못 알아들으면 { error } 를 돌려줍니다. signal.aborted 가 되면 멈춥니다.
export async function listen({ onText, signal, samples = VOICE_SAMPLES }) {
  if (canRecognize()) return listenReal({ onText, signal });
  return listenSample({ onText, signal, samples });
}

function listenReal({ onText, signal }) {
  return new Promise((resolve) => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      onText((finalText + interim).trim());
    };
    rec.onerror = (e) => finish({ error: e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'nospeech' });
    rec.onend = () => finish(finalText.trim() ? finalText.trim() : { error: 'nospeech' });
    signal?.addEventListener('abort', () => {
      try {
        rec.abort();
      } catch {
        /* 무시 */
      }
      finish(null);
    });
    try {
      rec.start();
    } catch {
      finish({ error: 'nospeech' });
    }
  });
}

const sampleIdx = new Map();
async function listenSample({ onText, signal, samples }) {
  const i = sampleIdx.get(samples) || 0;
  sampleIdx.set(samples, i + 1);
  const phrase = samples[i % samples.length];
  await wait(900, signal); // "듣고 있어요…" 잠깐
  for (let k = 1; k <= phrase.length; k += 1) {
    if (signal?.aborted) return null;
    onText(phrase.slice(0, k));
    await wait(phrase[k - 1] === ' ' ? 60 : 110, signal);
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
