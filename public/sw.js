// 약속 서비스 워커
// 1) 앱 화면을 저장해 두어 인터넷이 약해도 빨리 열리게 합니다.
// 2) 앱이 닫혀 있어도 서버에서 보낸 복용 알림(푸시)을 띄웁니다.

const CACHE = 'yaksok-v1';
const SCOPE = self.registration.scope; // 예: https://.../yaksok-1/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}icon-192.png`]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase 등 외부 요청은 그대로

  // 화면(HTML): 새 버전을 먼저 받고, 안 되면 저장본
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SCOPE, copy));
          return res;
        })
        .catch(() => caches.match(SCOPE)),
    );
    return;
  }

  // 나머지(JS·CSS·아이콘): 저장본을 먼저, 없으면 받아서 저장
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// ───── 푸시 알림 ─────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: '약속', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || '약 드실 시간이에요';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag || 'yaksok',
      renotify: true,
      requireInteraction: true,
      lang: 'ko',
      icon: `${SCOPE}icon-192.png`,
      badge: `${SCOPE}icon-192.png`,
      vibrate: [200, 100, 200],
      data: { url: data.url || (data.minutes != null ? `${SCOPE}#/alarm/${data.minutes}` : SCOPE) },
    }),
  );
});

// 알림을 누르면 앱을 열고 해당 복용 알림 화면으로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || SCOPE;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => w.url.startsWith(SCOPE));
      if (win) {
        win.postMessage({ type: 'navigate', url: target });
        return win.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
