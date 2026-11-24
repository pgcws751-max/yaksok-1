// 브라우저 알림. 앱(탭)이 열려 있는 동안 정해진 시간에 알림을 띄웁니다.
// 앱을 완전히 닫아도 오는 진짜 푸시 알림은 서버(웹 푸시)가 필요합니다.

export function notifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notifyPermission() {
  return notifySupported() ? Notification.permission : 'unsupported';
}

export function canNotify() {
  return notifyPermission() === 'granted';
}

export async function requestNotify() {
  if (!notifySupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showNotification(title, { body, tag, onClick } = {}) {
  if (!canNotify()) return;
  try {
    const n = new Notification(title, { body, tag, lang: 'ko' });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch {
    /* 일부 모바일 브라우저는 페이지에서 직접 알림을 만들 수 없습니다 */
  }
}
