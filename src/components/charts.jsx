import { useEffect, useRef, useState } from 'react';

// 관리자 대시보드용 차트 (단일 계열)
//  - 막대: 최대 24px, 끝 4px 둥글게, 바닥은 직선, 2px 간격
//  - 선: 2px, 연한 면 채우기, 마우스를 올리면 세로선 + 점 + 말풍선
//  - 눈금선은 1px 연한 회색, 값은 글자색(데이터 색 X)

const C = { mark: '#3182F6', grid: '#EEF0F3', axis: '#8B95A1', text: '#4E5968' };
const PAD = { top: 16, right: 12, bottom: 26, left: 36 };

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(v, minTop) {
  const max = Math.max(v, minTop);
  if (max <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(max));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="status">
      <b>{tip.title}</b>
      <span>{tip.value}</span>
    </div>
  );
}

function TableView({ rows, columns }) {
  return (
    <div className="chart-table">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key}>{c.format ? c.format(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartCard({ title, sub, children, table }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="card chart-card">
      <div className="chart-head">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {table && (
          <button type="button" className="chip-opt" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
            {asTable ? '차트로 보기' : '표로 보기'}
          </button>
        )}
      </div>
      {asTable ? <TableView {...table} /> : children}
    </section>
  );
}

// 막대 차트: data = [{ label, value, title }]
export function BarChart({ data, height = 200, unit = '', minTop = 5 }) {
  const [ref, w] = useWidth();
  const [tip, setTip] = useState(null);
  const iw = w - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)), minTop);
  const band = iw / data.length;
  const bw = Math.max(2, Math.min(24, band - 2));
  const y = (v) => PAD.top + ih - (v / max) * ih;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(iw / 44)));

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setTip(null)}>
      <svg width={w} height={height} role="img" aria-label="막대 차트">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={C.axis}>
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2;
          const top = y(d.value);
          const h = PAD.top + ih - top;
          const r = Math.min(4, h, bw / 2);
          const x0 = cx - bw / 2;
          const base = PAD.top + ih;
          return (
            <g key={i}>
              {d.value > 0 && (
                <path
                  d={`M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${base} Z`}
                  fill={C.mark}
                  opacity={tip && tip.i !== i ? 0.45 : 1}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill={C.axis}>
                  {d.label}
                </text>
              )}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={ih}
                fill="transparent"
                onMouseEnter={() => setTip({ i, x: cx, y: Math.min(top, base - 8) - 8, title: d.title, value: `${d.value}${unit}` })}
              />
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

// 선 차트: data = [{ label, value | null, title, detail }] (null = 그날 먹을 약이 없음)
export function LineChart({ data, height = 200, max = 100, unit = '%' }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const iw = w - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const step = data.length > 1 ? iw / (data.length - 1) : 0;
  const x = (i) => PAD.left + step * i;
  const y = (v) => PAD.top + ih - (v / max) * ih;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(iw / 44)));

  // null 은 끊어서 그립니다
  const segs = [];
  let cur = [];
  data.forEach((d, i) => {
    if (d.value == null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push([x(i), y(d.value)]);
  });
  if (cur.length) segs.push(cur);
  const base = PAD.top + ih;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(data.length - 1, Math.round((e.clientX - rect.left - PAD.left) / (step || 1))));
    setHover(i);
  };
  const h = hover != null ? data[hover] : null;
  const last = [...data].reverse().find((d) => d.value != null);
  const lastIdx = last ? data.lastIndexOf(last) : -1;

  return (
    <div className="chart" ref={ref}>
      <svg width={w} height={height} role="img" aria-label="선 차트" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={C.axis}>
              {t}
            </text>
          </g>
        ))}
        {segs.map((s, k) => (
          <g key={k}>
            {s.length > 1 && (
              <path d={`M${s[0][0]},${base} ${s.map((p) => `L${p[0]},${p[1]}`).join(' ')} L${s[s.length - 1][0]},${base} Z`} fill={C.mark} opacity="0.1" />
            )}
            <path d={s.map((p, j) => `${j ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')} fill="none" stroke={C.mark} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {s.length === 1 && <circle cx={s[0][0]} cy={s[0][1]} r="4" fill={C.mark} />}
          </g>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill={C.axis}>
              {d.label}
            </text>
          ) : null,
        )}
        {lastIdx >= 0 && hover == null && (
          <g>
            <circle cx={x(lastIdx)} cy={y(last.value)} r="5" fill={C.mark} stroke="#fff" strokeWidth="2" />
            <text x={x(lastIdx) - 8} y={y(last.value) - 10} textAnchor="end" fontSize="12" fontWeight="700" fill={C.text}>
              {last.value}
              {unit}
            </text>
          </g>
        )}
        {h && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={base} stroke={C.axis} strokeWidth="1" />
            {h.value != null && <circle cx={x(hover)} cy={y(h.value)} r="5" fill={C.mark} stroke="#fff" strokeWidth="2" />}
          </g>
        )}
      </svg>
      {h && (
        <Tooltip
          tip={{
            x: x(hover),
            y: (h.value != null ? y(h.value) : base) - 12,
            title: h.title,
            value: h.value == null ? '먹을 약 없음' : `${h.value}${unit}${h.detail ? ` · ${h.detail}` : ''}`,
          }}
        />
      )}
    </div>
  );
}
