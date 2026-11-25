import Icon from './Icon.jsx';

// 약마다 다른 색을 줘서 한눈에 구분되게 합니다. (약 id로 색을 고르므로 늘 같은 색)
const PALETTE = [
  { fg: '#F08A24', bg: '#FFF0E0' },
  { fg: '#3182F6', bg: '#E8F3FF' },
  { fg: '#08875A', bg: '#E3F6EC' },
  { fg: '#E5527A', bg: '#FFEBF1' },
  { fg: '#7B61FF', bg: '#F0EDFF' },
  { fg: '#0CA5B5', bg: '#E0F6F8' },
];

export function medColor(med) {
  let h = 0;
  for (const c of String(med.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function MedIcon({ med, size = 40 }) {
  const c = medColor(med);
  return (
    <span className="med-ic" style={{ background: c.bg, color: c.fg, width: size, height: size }} aria-hidden="true">
      <Icon name="pill" size={Math.round(size * 0.5)} strokeWidth={2.3} />
    </span>
  );
}
