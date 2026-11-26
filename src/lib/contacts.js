// 가족·지인 연락처 — 지금은 이 기기에만 저장합니다 (회원별로 따로)
import { load, newId, save } from './storage.js';

export const RELATIONS = ['딸', '아들', '배우자', '며느리', '사위', '손주', '형제자매', '친구', '보호자', '요양보호사', '기타'];

const key = (userId) => `yaksok:contacts:${userId || 'guest'}`;
const digits = (s) => String(s || '').replace(/\D/g, '');

export function listContacts(userId) {
  return load(key(userId), []);
}

export function addContact(userId, { name, relation, phone }) {
  const p = digits(phone);
  if (!name.trim()) throw Object.assign(new Error(), { userMessage: '이름을 적어 주세요' });
  if (p.length < 9) throw Object.assign(new Error(), { userMessage: '전화번호를 정확히 적어 주세요' });
  const list = [...listContacts(userId), { id: newId(), name: name.trim(), relation, phone: p }];
  save(key(userId), list);
  return list;
}

export function removeContact(userId, id) {
  const list = listContacts(userId).filter((c) => c.id !== id);
  save(key(userId), list);
  return list;
}

export function phoneText(p) {
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  if (p.length === 10) return p.startsWith('02') ? `${p.slice(0, 2)}-${p.slice(2, 6)}-${p.slice(6)}` : `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  return p;
}

// "딸에게 전화해줘", "김영희한테 연락" → 맞는 연락처 찾기
export function findContact(userId, text) {
  const t = text.replace(/\s/g, '');
  const list = listContacts(userId);
  return (
    list.find((c) => t.includes(c.name.replace(/\s/g, ''))) ||
    list.find((c) => c.relation && t.includes(c.relation)) ||
    (/(엄마|어머니)/.test(t) && list.find((c) => c.relation === '보호자')) ||
    null
  );
}
