// 기기 저장소(localStorage) 읽기/쓰기.
// 사생활 보호 모드 등에서 저장소가 막혀 있어도 앱이 멈추지 않도록 감쌉니다.

export function load(key, fallback, area = 'local') {
  try {
    const store = area === 'session' ? window.sessionStorage : window.localStorage;
    const raw = store.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value, area = 'local') {
  try {
    const store = area === 'session' ? window.sessionStorage : window.localStorage;
    if (value === undefined) store.removeItem(key);
    else store.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 실패는 무시 — 화면은 계속 동작합니다 */
  }
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// 서버(Supabase)에서도 쓸 수 있는 UUID
export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const h = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  h[12] = '4';
  h[16] = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
