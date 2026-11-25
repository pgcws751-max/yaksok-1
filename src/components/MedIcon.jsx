import Icon from './Icon.jsx';

// 약마다 다른 색을 줘서 한눈에 구분되게 합니다. (약 id로 색을 고르므로 늘 같은 색)
const PALETTE = [
  { fg: '#12805C', bg: '#E4F4EC' },
  { fg: '#2F6FE4', bg: '#E6EEFD' },
  { fg: '#D9811A', bg: '#FDF1E2' },
  { fg: '#C2417B', bg: '#FBE8F0' },
  { fg: '#7A4FD6', bg: '#EFE9FC' },
  { fg: '#0E8FA6', bg: '#E1F4F7' },
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
