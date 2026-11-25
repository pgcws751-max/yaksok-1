// ─────────────────────────────────────────────────────────────
// 데이터 창구: 화면은 이 파일만 부릅니다.
//  - 실제 회원: Supabase (remoteApi.js)
//  - "가입 없이 체험해 보기": 이 기기에만 저장 (localApi.js)
// ─────────────────────────────────────────────────────────────
import * as local from './localApi.js';
import * as remote from './remoteApi.js';
import { load, save } from './storage.js';

const MODE = 'yaksok:mode';
const isDemo = () => load(MODE, null) === 'demo';
const be = () => (isDemo() ? local : remote);

export const DEFAULT_SETTINGS = remote.DEFAULT_SETTINGS;

// 로그인 전 기능은 언제나 Supabase
export const signUp = (form) => remote.signUp(form);
export const logIn = (form) => {
  save(MODE, undefined);
  return remote.logIn(form);
};
export const findUsername = (form) => remote.findUsername(form);
export const verifyIdentity = (form) => remote.verifyIdentity(form);
export const resetPassword = (form) => remote.resetPassword(form);
export const oauthProviders = () => remote.oauthProviders();
export const signInWithProvider = (p) => {
  save(MODE, undefined);
  return remote.signInWithProvider(p);
};

export async function startDemo() {
  save(MODE, 'demo');
  return local.startDemo();
}

export async function logOut() {
  const demo = isDemo();
  save(MODE, undefined);
  return demo ? local.logOut() : remote.logOut();
}

export const currentUser = () => be().currentUser();
export const updateProfile = (...a) => be().updateProfile(...a);
export const changePassword = (...a) => be().changePassword(...a);
export async function withdraw(...a) {
  const demo = isDemo();
  await be().withdraw(...a);
  save(MODE, undefined);
  if (demo) await local.logOut();
}
export const loadData = (...a) => be().loadData(...a);
export const syncData = (...a) => be().syncData(...a);
