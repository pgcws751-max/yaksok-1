// ─────────────────────────────────────────────────────────────
// 안드로이드 앱(Capacitor)에서만 쓰는 기능
//  - 복용 알림: 앞으로 14일치 복용 시간을 휴대폰에 예약합니다 (인터넷이 없어도 울림).
//    약·시간·복용 기록·알림 설정이 바뀔 때마다 예약을 새로 맞춥니다.
//  - 알림을 누르면 해당 복용 알림 화면으로 이동
//  - 휴대폰 뒤로 가기 버튼 처리
// 웹(브라우저)에서는 아무 일도 하지 않습니다.
// ─────────────────────────────────────────────────────────────
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapApp } from '@capacitor/app';
import { addDays, dateKey, parseKey } from './date.js';
import { slotsOn } from './schedule.js';
import { formatTime } from '../time.js';

export const isNative = () => Capacitor.isNativePlatform();

const DAYS_AHEAD = 14;
const CHANNEL = 'dose';

let inited = false;
export async function initNative(navigate) {
  if (!isNative() || inited) return;
  inited = true;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: '복용 알림',
      description: '약 드실 시간을 알려 드려요',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch {
    /* 채널은 안드로이드 8 이상 */
  }
  LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const m = notification?.extra?.minutes;
    if (m != null) navigate(`/alarm/${m}`);
  });
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.history.length > 1) window.history.back();
    else CapApp.exitApp();
  });
}

// ───── 권한 ─────

export async function notifyPermission() {
  if (!isNative()) return 'unsupported';
  const { display } = await LocalNotifications.checkPermissions();
  return display; // 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
}

export async function requestNotifyPermission() {
  if (!isNative()) return 'unsupported';
  const { display } = await LocalNotifications.requestPermissions();
  return display;
}

// 정확한 시각 알림 (안드로이드 12+) — 꺼져 있으면 몇 분 늦게 울릴 수 있어요
export async function exactAlarmSetting() {
  if (!isNative()) return 'granted';
  try {
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
    return exact_alarm;
  } catch {
    return 'granted';
  }
}
export async function openExactAlarmSetting() {
  try {
    await LocalNotifications.changeExactNotificationSetting();
  } catch {
    /* 무시 */
  }
}

// ───── 예약 ─────

async function cancelAll() {
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length) await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
}

function atOf(key, minutes) {
  const d = parseKey(key);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

// 다음 14일치 알림 목록 만들기
export function buildReminders(data, now = new Date()) {
  const s = data.settings;
  if (!s.notify) return [];
  const today = dateKey(now);
  const list = [];
  for (let i = 0; i < DAYS_AHEAD; i += 1) {
    const key = addDays(today, i);
    slotsOn(data.meds, data.logs, key).forEach((slot) => {
      if (slot.taken) return;
      const names = slot.items.filter((x) => !x.taken).map((x) => x.med.name).join(', ');
      const base = { channelId: CHANNEL, smallIcon: 'ic_stat_yaksok', iconColor: '#1F6FE5', extra: { minutes: slot.minutes, day: key } };
      const at = atOf(key, slot.minutes);
      if (at > now) {
        list.push({ ...base, id: i * 10000 + slot.minutes * 2, title: `${slot.label} 약 드실 시간이에요`, body: `${formatTime(slot.minutes)} · ${names}`, schedule: { at, allowWhileIdle: true } });
      }
      if (s.remind) {
        const again = new Date(at.getTime() + s.remindMinutes * 60000);
        if (again > now) {
          list.push({ ...base, id: i * 10000 + slot.minutes * 2 + 1, title: `${slot.label} 약, 아직 안 드셨어요`, body: `${formatTime(slot.minutes)} · ${names}`, schedule: { at: again, allowWhileIdle: true } });
        }
      }
    });
  }
  return list;
}

let timer = null;
// 바뀔 때마다 부르지만, 0.8초 안에 여러 번 바뀌면 마지막 한 번만 예약합니다.
export function rescheduleReminders(data) {
  if (!isNative()) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const perm = await notifyPermission();
      await cancelAll();
      if (perm !== 'granted' || !data) return;
      const list = buildReminders(data);
      if (list.length) await LocalNotifications.schedule({ notifications: list });
    } catch (e) {
      console.warn('reminder schedule failed', e);
    }
  }, 800);
}

export async function clearReminders() {
  if (!isNative()) return;
  clearTimeout(timer);
  try {
    await cancelAll();
  } catch {
    /* 무시 */
  }
}

export async function testNotification() {
  if (!isNative()) return false;
  await LocalNotifications.schedule({
    notifications: [
      { id: 999999, title: '약속 알림 시험', body: '이렇게 알려 드릴게요', channelId: CHANNEL, smallIcon: 'ic_stat_yaksok', iconColor: '#1F6FE5', schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true } },
    ],
  });
  return true;
}

export async function pendingCount() {
  if (!isNative()) return 0;
  const { notifications } = await LocalNotifications.getPending();
  return notifications.filter((n) => n.id !== 999999).length;
}
