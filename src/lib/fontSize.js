// 글자 크기: html 의 기본 글자 크기(px)를 바꾸면 rem 으로 만든 화면 전체가 함께 바뀝니다.
import { load, save } from './storage.js';

const KEY = 'yaksok:fontSize';
export const FONT_SIZES = [
  { px: 14, label: '작게' },
  { px: 16, label: '보통' },
  { px: 18, label: '크게' },
  { px: 20, label: '더 크게' },
];
export const FONT_LABEL = Object.fromEntries(FONT_SIZES.map((f) => [f.px, f.label]));

export function fontSize() {
  const v = Number(load(KEY, 16));
  return FONT_LABEL[v] ? v : 16;
}

export function applyFontSize(px = fontSize()) {
  document.documentElement.style.fontSize = `${px}px`;
}

export function setFontSize(px) {
  save(KEY, px);
  applyFontSize(px);
}
