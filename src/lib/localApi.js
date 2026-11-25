// ─────────────────────────────────────────────────────────────
// 기기 저장소(localStorage) 데이터 창구 — "가입 없이 체험해 보기" 전용
// 실제 회원 데이터는 remoteApi.js(Supabase)로 저장합니다.
// ─────────────────────────────────────────────────────────────
import { load, save, uid } from './storage.js';
import { addDays, dateKey, weekdayOf } from './date.js';

const USERS = 'yaksok:users';
const SESSION = 'yaksok:session';
const dataKey = (userId) => `yaksok:data:${userId}`;

export const DEFAULT_SETTINGS = {
  notify: true, // 복용 알림 켜기
  remind: true, // 안 드시면 다시 알림
  remindMinutes: 10,
};

const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

async function hash(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`yaksok:${text}`));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // 보안 연결(https)이 아닌 곳에서는 subtle을 쓸 수 없어 간단한 방식으로 대신합니다.
    let h = 0;
    for (const c of `yaksok:${text}`) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
    return `w${h >>> 0}`;
  }
}

const users = () => load(USERS, []);
const publicUser = ({ passwordHash, ...u }) => ({ ...u, provider: 'demo' });

function fail(message) {
  const e = new Error(message);
  e.userMessage = message;
  throw e;
}

// ───────── 회원 ─────────

export async function signUp({ username, password, name, phone, agreePush }) {
  const id = username.trim();
  if (!/^[a-zA-Z0-9_]{4,20}$/.test(id)) fail('아이디는 영문·숫자 4~20자로 만들어 주세요');
  if (password.length < 6) fail('비밀번호는 6자 이상으로 만들어 주세요');
  if (!name.trim()) fail('이름을 적어 주세요');
  if (onlyDigits(phone).length < 10) fail('연락처를 숫자로 정확히 적어 주세요');
  const list = users();
  if (list.some((u) => u.username.toLowerCase() === id.toLowerCase())) fail('이미 쓰고 있는 아이디예요');

  const user = {
    id: uid('u'),
    username: id,
    passwordHash: await hash(password),
    name: name.trim(),
    phone: onlyDigits(phone),
    agreePush: !!agreePush,
    createdAt: new Date().toISOString(),
  };
  save(USERS, [...list, user]);
  save(dataKey(user.id), {
    meds: [],
    logs: {},
    settings: { ...DEFAULT_SETTINGS, notify: !!agreePush },
  });
  return publicUser(user);
}

export async function logIn({ username, password, autoLogin }) {
  const h = await hash(password);
  const user = users().find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user || user.passwordHash !== h) fail('아이디 또는 비밀번호가 맞지 않아요');
  save(SESSION, undefined, 'local');
  save(SESSION, undefined, 'session');
  save(SESSION, { userId: user.id }, autoLogin ? 'local' : 'session');
  return publicUser(user);
}

export async function logOut() {
  save(SESSION, undefined, 'local');
  save(SESSION, undefined, 'session');
}

export async function currentUser() {
  const s = load(SESSION, null, 'local') || load(SESSION, null, 'session');
  if (!s) return null;
  const user = users().find((u) => u.id === s.userId);
  return user ? publicUser(user) : null;
}

export async function findUsername({ name, phone }) {
  const user = users().find((u) => u.name === name.trim() && u.phone === onlyDigits(phone));
  if (!user) fail('입력하신 정보로 가입된 아이디가 없어요');
  return { username: user.username, createdAt: user.createdAt };
}

// 비밀번호 찾기 1단계: 본인 확인
export async function verifyIdentity({ username, name, phone }) {
  const user = users().find(
    (u) =>
      u.username.toLowerCase() === username.trim().toLowerCase() &&
      u.name === name.trim() &&
      u.phone === onlyDigits(phone),
  );
  if (!user) fail('입력하신 정보와 일치하는 회원이 없어요');
  return { userId: user.id };
}

// 비밀번호 찾기 2단계: 재설정
export async function resetPassword({ userId, password }) {
  if (password.length < 6) fail('비밀번호는 6자 이상으로 만들어 주세요');
  const h = await hash(password);
  save(USERS, users().map((u) => (u.id === userId ? { ...u, passwordHash: h } : u)));
}

export async function updateProfile(userId, { name, phone }) {
  if (!name.trim()) fail('이름을 적어 주세요');
  if (onlyDigits(phone).length < 10) fail('연락처를 숫자로 정확히 적어 주세요');
  const list = users().map((u) => (u.id === userId ? { ...u, name: name.trim(), phone: onlyDigits(phone) } : u));
  save(USERS, list);
  return publicUser(list.find((u) => u.id === userId));
}

export async function changePassword(userId, { current, next }) {
  const list = users();
  const user = list.find((u) => u.id === userId);
  if (!user || user.passwordHash !== (await hash(current))) fail('지금 비밀번호가 맞지 않아요');
  await resetPassword({ userId, password: next });
}

export async function withdraw(userId, password) {
  const user = users().find((u) => u.id === userId);
  if (!user || user.passwordHash !== (await hash(password))) fail('비밀번호가 맞지 않아요');
  save(USERS, users().filter((u) => u.id !== userId));
  save(dataKey(userId), undefined);
  await logOut();
}

// ───────── 약 · 기록 · 설정 ─────────

export async function loadData(userId) {
  const d = load(dataKey(userId), null) || {};
  return {
    meds: d.meds || [],
    logs: d.logs || {},
    settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) },
  };
}

export async function saveData(userId, data) {
  save(dataKey(userId), data);
}

// ───────── 체험용 계정 ─────────

export async function startDemo() {
  const username = 'demo';
  const password = 'demo1234';
  let user = users().find((u) => u.username === username);
  if (!user) {
    await signUp({ username, password, name: '김약속', phone: '010-1234-5678', agreePush: true });
    user = users().find((u) => u.username === username);
    const today = dateKey();
    const start = addDays(today, -30);
    const every = [0, 1, 2, 3, 4, 5, 6];
    const meds = [
      { id: 'm_bp', name: '혈압약', dose: '1알', startDate: start, endDate: null, memo: '아침에 꼭 챙기기', times: [7 * 60 + 30, 12 * 60 + 30], days: every, meal: 'after' },
      { id: 'm_dm', name: '당뇨약', dose: '1알', startDate: start, endDate: null, memo: '', times: [12 * 60 + 30, 18 * 60 + 30], days: every, meal: 'after' },
      { id: 'm_vit', name: '비타민D', dose: '1알', startDate: start, endDate: addDays(today, 60), memo: '', times: [7 * 60 + 30], days: [1, 3, 5], meal: 'any' },
    ];
    // 지난 30일 기록: 가끔 놓친 날이 있도록 채웁니다.
    const logs = {};
    for (let i = 30; i >= 1; i -= 1) {
      const key = addDays(today, -i);
      const wd = weekdayOf(key);
      logs[key] = {};
      meds.forEach((m) => {
        if (!m.days.includes(wd)) return;
        m.times.forEach((t) => {
          const miss = (i * 7 + t + wd) % 11 === 0;
          if (!miss) logs[key][`${m.id}@${t}`] = `${key}T${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}:00`;
        });
      });
    }
    save(dataKey(user.id), { meds, logs, settings: { ...DEFAULT_SETTINGS } });
  }
  return logIn({ username, password, autoLogin: false });
}

export async function syncData(userId, prev, next) {
  return saveData(userId, next);
}
