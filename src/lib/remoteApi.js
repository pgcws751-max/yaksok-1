// ─────────────────────────────────────────────────────────────
// Supabase 데이터 창구 (회원 · 약 · 복용 기록 · 설정)
//
// 테이블: profiles(내 정보) · meds(약) · dose_logs(복용 기록) · settings(알림 설정)
// 서버 함수: account(아이디 가입·아이디 찾기·비밀번호 재설정), delete-account(탈퇴)
// ─────────────────────────────────────────────────────────────
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase as sb, SUPABASE_KEY, SUPABASE_URL, cleanAuthParams } from './supabase.js';
import { load, save } from './storage.js';
import { addDays, dateKey } from './date.js';
import { currentSubscription } from './pwa.js';

export const DEFAULT_SETTINGS = { notify: true, remind: true, remindMinutes: 10 };
const ID_DOMAIN = 'id.yaksok.app'; // 아이디를 Supabase 계정(이메일 형식)에 연결할 때 쓰는 내부 주소
const NO_AUTO = 'yaksok:noAutoLogin';
const ALIVE = 'yaksok:alive';

const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
const toEmail = (username) => `${username.trim().toLowerCase()}@${ID_DOMAIN}`;

function fail(message) {
  const e = new Error(message);
  e.userMessage = message;
  throw e;
}

async function callAccount(body) {
  const { data, error } = await sb.functions.invoke('account', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      let msg = '';
      try {
        msg = (await error.context.json()).error;
      } catch {
        /* 무시 */
      }
      fail(msg || '요청을 처리하지 못했어요');
    }
    fail('인터넷 연결을 확인해 주세요');
  }
  return data;
}

async function profileOf(user) {
  const [{ data: p }, { data: admin }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    sb.rpc('is_admin'),
  ]);
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    username: p?.username || null,
    name: p?.name || meta.full_name || meta.name || '회원',
    phone: p?.phone || '',
    provider: user.app_metadata?.provider || 'email',
    createdAt: p?.created_at || user.created_at,
    isAdmin: admin === true,
  };
}

// ───────── 회원 ─────────

export async function signUp({ username, password, name, phone, agreePush }) {
  await callAccount({ action: 'signup', username, password, name, phone, agreePush });
}

export async function logIn({ username, password, autoLogin }) {
  if (!/^[a-zA-Z0-9_]{4,20}$/.test(username.trim())) fail('아이디 또는 비밀번호가 맞지 않아요');
  const { data, error } = await sb.auth.signInWithPassword({ email: toEmail(username), password });
  if (error) {
    if (/invalid/i.test(error.message)) fail('아이디 또는 비밀번호가 맞지 않아요');
    fail('로그인하지 못했어요. 인터넷 연결을 확인해 주세요');
  }
  save(NO_AUTO, autoLogin ? undefined : true);
  save(ALIVE, true, 'session');
  return profileOf(data.user);
}

export async function logOut() {
  save(NO_AUTO, undefined);
  // 이 기기로 오던 복용 알림을 끊습니다 (다른 사람이 로그인해도 내 알림이 오지 않게)
  try {
    const sub = await currentSubscription();
    if (sub) await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  } catch {
    /* 무시 */
  }
  save('yaksok:pushOn', undefined);
  await sb.auth.signOut();
}

export async function currentUser() {
  const { data } = await sb.auth.getSession();
  cleanAuthParams();
  const session = data?.session;
  if (!session) return null;
  // 자동 로그인을 끄고 로그인했다면, 브라우저를 다시 열었을 때 로그아웃합니다.
  if (load(NO_AUTO, false) && !load(ALIVE, false, 'session')) {
    await logOut();
    return null;
  }
  save(ALIVE, true, 'session');
  return profileOf(session.user);
}

export async function findUsername({ name, phone }) {
  return callAccount({ action: 'find-id', name, phone });
}

// 비밀번호 찾기 1단계: 본인 확인. 확인한 정보를 2단계에 그대로 넘깁니다.
export async function verifyIdentity({ username, name, phone }) {
  await callAccount({ action: 'verify', username, name, phone });
  return { userId: { username, name, phone } };
}

export async function resetPassword({ userId, password }) {
  if (password.length < 6) fail('비밀번호는 6자 이상으로 만들어 주세요');
  await callAccount({ action: 'reset-password', ...userId, password });
}

export async function updateProfile(userId, { name, phone }) {
  if (!name.trim()) fail('이름을 적어 주세요');
  if (onlyDigits(phone).length < 10) fail('연락처를 숫자로 정확히 적어 주세요');
  const { error } = await sb.from('profiles').update({ name: name.trim(), phone: onlyDigits(phone) }).eq('id', userId);
  if (error) fail('저장하지 못했어요');
  const { data } = await sb.auth.getUser();
  return profileOf(data.user);
}

async function checkPassword(password) {
  const { data } = await sb.auth.getUser();
  const email = data?.user?.email;
  if (!email) fail('다시 로그인해 주세요');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return !error;
}

export async function changePassword(userId, { current, next }) {
  if (!(await checkPassword(current))) fail('지금 비밀번호가 맞지 않아요');
  if (next.length < 6) fail('비밀번호는 6자 이상으로 만들어 주세요');
  const { error } = await sb.auth.updateUser({ password: next });
  if (error) fail(/different|same/i.test(error.message) ? '지금과 다른 비밀번호로 정해 주세요' : '바꾸지 못했어요');
}

export async function withdraw(userId, password, { skipPassword = false } = {}) {
  if (!skipPassword && !(await checkPassword(password))) fail('비밀번호가 맞지 않아요');
  const { error } = await sb.functions.invoke('delete-account', { body: {} });
  if (error) fail('탈퇴하지 못했어요. 잠시 후 다시 해 주세요');
  await logOut();
}

// ───────── 간편 로그인 (카카오 · 구글) ─────────

// Supabase에서 켜 둔 간편 로그인만 버튼으로 보여 줍니다.
export async function oauthProviders() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    const ext = (await res.json()).external || {};
    return ['kakao', 'google'].filter((p) => ext[p]);
  } catch {
    return [];
  }
}

export async function signInWithProvider(provider) {
  save(NO_AUTO, undefined);
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
  });
  if (error) fail('간편 로그인을 시작하지 못했어요');
}

// ───────── 약 · 기록 · 설정 ─────────

const medFromRow = (r) => ({
  id: r.id,
  name: r.name,
  dose: r.dose,
  startDate: r.start_date,
  endDate: r.end_date,
  memo: r.memo || '',
  times: r.times || [],
  days: r.days || [],
  meal: r.meal,
});
const medToRow = (m) => ({
  id: m.id,
  name: m.name,
  dose: m.dose,
  start_date: m.startDate,
  end_date: m.endDate || null,
  memo: m.memo || '',
  times: m.times,
  days: m.days,
  meal: m.meal,
  updated_at: new Date().toISOString(),
});

async function allLogs(since) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('dose_logs')
      .select('med_id,taken_on,minutes,taken_at')
      .gte('taken_on', since)
      .order('taken_on')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function loadData() {
  const [m, s, l] = await Promise.all([
    sb.from('meds').select('*').order('created_at'),
    sb.from('settings').select('*').maybeSingle(),
    allLogs(addDays(dateKey(), -400)),
  ]);
  if (m.error) throw m.error;
  const logs = {};
  l.forEach((r) => {
    (logs[r.taken_on] ||= {})[`${r.med_id}@${r.minutes}`] = r.taken_at;
  });
  return {
    meds: m.data.map(medFromRow),
    logs,
    settings: s.data
      ? { notify: s.data.notify, remind: s.data.remind, remindMinutes: s.data.remind_minutes }
      : { ...DEFAULT_SETTINGS },
  };
}

function flatLogs(logs) {
  const out = new Map();
  Object.entries(logs).forEach(([day, entries]) =>
    Object.entries(entries).forEach(([k, at]) => out.set(`${day}|${k}`, at)),
  );
  return out;
}
const parseLogKey = (k) => {
  const [day, rest] = k.split('|');
  const [medId, minutes] = rest.split('@');
  return { med_id: medId, taken_on: day, minutes: Number(minutes) };
};

// 바뀐 부분만 서버에 반영합니다. 순서가 꼬이지 않게 한 줄로 세워 처리합니다.
let queue = Promise.resolve();
export function syncData(userId, prev, next) {
  const run = queue.then(() => pushChanges(userId, prev, next));
  queue = run.catch(() => {});
  return run;
}

async function pushChanges(userId, prev, next) {
  const check = ({ error }) => {
    if (error) throw error;
  };
  // 약
  const prevMeds = new Map(prev.meds.map((m) => [m.id, m]));
  const nextIds = new Set(next.meds.map((m) => m.id));
  const changed = next.meds.filter((m) => JSON.stringify(prevMeds.get(m.id)) !== JSON.stringify(m));
  const removedMeds = prev.meds.filter((m) => !nextIds.has(m.id)).map((m) => m.id);
  if (changed.length) check(await sb.from('meds').upsert(changed.map((m) => ({ ...medToRow(m), user_id: userId }))));

  // 복용 기록
  const a = flatLogs(prev.logs);
  const b = flatLogs(next.logs);
  const added = [...b.keys()].filter((k) => !a.has(k));
  const removed = [...a.keys()].filter((k) => !b.has(k));
  if (added.length) {
    const rows = added.map((k) => ({ ...parseLogKey(k), taken_at: b.get(k), user_id: userId }));
    check(await sb.from('dose_logs').upsert(rows, { onConflict: 'med_id,taken_on,minutes', ignoreDuplicates: true }));
  }
  for (const k of removed) {
    const key = parseLogKey(k);
    if (removedMeds.includes(key.med_id)) continue; // 약을 지우면 기록도 함께 지워짐
    check(await sb.from('dose_logs').delete().match(key));
  }

  if (removedMeds.length) check(await sb.from('meds').delete().in('id', removedMeds));

  // 설정
  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    const s = next.settings;
    check(
      await sb.from('settings').upsert({ user_id: userId, notify: s.notify, remind: s.remind, remind_minutes: s.remindMinutes }),
    );
  }
}

// ───── 앱이 닫혀 있어도 오는 알림 (웹 푸시) ─────

export async function savePushSubscription(userId, sub) {
  const j = sub.toJSON();
  const { error } = await sb.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) },
    { onConflict: 'endpoint' },
  );
  if (error) fail('알림 등록을 저장하지 못했어요');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
  await sb.from('settings').update({ tz }).eq('user_id', userId);
}

export async function deletePushSubscription(endpoint) {
  if (endpoint) await sb.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

export async function snoozeRemote(userId, day, minutes, fireAt) {
  await sb.from('push_snoozes').upsert({ user_id: userId, day, minutes, fire_at: fireAt.toISOString() });
}

// ───── 관리자 (서버에서 관리자인지 다시 확인합니다) ─────

async function adminRpc(name, args) {
  const { data, error } = await sb.rpc(name, args);
  if (error) fail(/forbidden/.test(error.message) ? '관리자만 볼 수 있어요' : '불러오지 못했어요. 인터넷 연결을 확인해 주세요');
  return data;
}
export const adminStats = () => adminRpc('admin_stats');
export const adminUsers = () => adminRpc('admin_users');
export const adminUserDetail = (id) => adminRpc('admin_user_detail', { p_user: id });
export const adminAuditLog = () => adminRpc('admin_audit_log', { p_limit: 100 });
