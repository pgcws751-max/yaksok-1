// 앱 설치(PWA) · 서비스 워커 · 푸시 구독 도우미
import { load, save } from './storage.js';

export const VAPID_PUBLIC_KEY = 'BLsPTbBKqF0RKzCwpZKyZV2NuIo25kcQNM40GvfFNWwSjZfdXRhqk7TeizZbhxT8gB0A2EePgf_M3x-OPgk5SHA';
const PUSH_ON = 'yaksok:pushOn';

// ───── 서비스 워커 ─────

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
  // 알림을 눌렀을 때 서비스 워커가 보내는 "이 화면으로 이동"
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'navigate' && e.data.url) {
      const hash = new URL(e.data.url).hash;
      if (hash) window.location.hash = hash;
    }
  });
}

async function swReady() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((r) => setTimeout(() => r(null), 4000)),
    ]);
  } catch {
    return null;
  }
}

// ───── 설치 ─────

let installEvent = null;
const installListeners = new Set();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  installListeners.forEach((fn) => fn(true));
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  installListeners.forEach((fn) => fn(false));
});

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPromptInstall = () => !!installEvent;
export function onInstallChange(fn) {
  installListeners.add(fn);
  return () => installListeners.delete(fn);
}
export async function promptInstall() {
  if (!installEvent) return 'unavailable';
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  installListeners.forEach((fn) => fn(false));
  return outcome; // 'accepted' | 'dismissed'
}

// ───── 푸시 ─────

export function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // 아이폰은 홈 화면에 추가한 앱에서만 푸시를 받을 수 있어요 (iOS 16.4 이상)
    return isIOS() && !isStandalone() ? 'ios-needs-install' : 'unsupported';
  }
  return 'ok';
}

export const pushWanted = () => !!load(PUSH_ON, false);

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
  return reg?.pushManager ? reg.pushManager.getSubscription() : null;
}

// 권한을 묻고 구독을 만들어 돌려줍니다. (저장은 api.savePushSubscription)
export async function subscribePush() {
  if (pushSupport() !== 'ok') throw Object.assign(new Error('unsupported'), { code: pushSupport() });
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw Object.assign(new Error('denied'), { code: perm });
  const reg = await swReady();
  if (!reg) throw Object.assign(new Error('no-sw'), { code: 'no-sw' });
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
  }
  save(PUSH_ON, true);
  return sub;
}

export async function unsubscribePush() {
  save(PUSH_ON, undefined);
  const sub = await currentSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {});
  return endpoint;
}

// 앱 안에서 바로 띄우는 알림 (시험용 · 체험 모드용)
export async function showLocalNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const reg = await swReady();
  const opts = { lang: 'ko', icon: `${import.meta.env.BASE_URL}icon-192.png`, ...options };
  try {
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}
