import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { medColor } from '../components/MedIcon.jsx';
import TabBar from '../components/TabBar.jsx';
import { WEEKDAYS, addDays, dateLabel, monthEnd, monthStart, parseKey, shortLabel, weekStart, weekdayOf } from '../lib/date.js';
import { dayStatus, doseKey, rateBetween, slotsOn } from '../lib/schedule.js';
import { formatTime } from '../time.js';

const STATUS_TEXT = {
  done: '모두 드심',
  partial: '놓친 약 있음',
  missed: '못 드심',
  today: '오늘',
  future: '예정',
  none: '약 없음',
};

function Mark({ status, day }) {
  return (
    <span className={`mark ${status}`} aria-hidden="true">
      {status === 'done' ? <Icon name="check" size={16} /> : status === 'partial' || status === 'missed' ? '!' : day}
    </span>
  );
}

function Calendar({ ctx }) {
  const { data, today, now, takeSlot, untakeDose } = ctx;
  const [month, setMonth] = useState(monthStart(today));
  const [selected, setSelected] = useState(today);

  const first = month;
  const last = monthEnd(month);
  const lead = (weekdayOf(first) + 6) % 7; // 월요일 시작
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let k = first; k <= last; k = addDays(k, 1)) cells.push(k);

  const d = parseKey(month);
  const moveMonth = (n) => {
    const nd = new Date(d.getFullYear(), d.getMonth() + n, 1);
    setMonth(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const selSlots = slotsOn(data.meds, data.logs, selected);
  const rate = rateBetween(data.meds, data.logs, first, last, today, now);

  return (
    <>
      <section className="card cal" aria-label="복용 달력">
        <div className="cal-head">
          <button type="button" className="round sm" aria-label="이전 달" onClick={() => moveMonth(-1)}>
            <Icon name="back" size={18} strokeWidth={2.8} />
          </button>
          <b>
            {d.getFullYear()}년 {d.getMonth() + 1}월
          </b>
          <button type="button" className="round sm" aria-label="다음 달" onClick={() => moveMonth(1)}>
            <Icon name="chevron" size={18} strokeWidth={2.8} />
          </button>
        </div>
        <div className="cal-grid">
          {[1, 2, 3, 4, 5, 6, 0].map((w) => (
            <span key={w} className={`cal-wd ${w === 0 ? 'sun' : ''}`}>
              {WEEKDAYS[w]}
            </span>
          ))}
          {cells.map((k, i) => {
            if (!k) return <span key={`e${i}`} />;
            const st = dayStatus(data.meds, data.logs, k, today, now);
            const day = Number(k.slice(8));
            return (
              <button
                key={k}
                type="button"
                className={`cal-day ${k === selected ? 'is-sel' : ''} ${k === today ? 'is-today' : ''}`}
                aria-label={`${shortLabel(k)} ${STATUS_TEXT[st]}`}
                aria-pressed={k === selected}
                onClick={() => setSelected(k)}
              >
                <Mark status={st} day={day} />
                {(st === 'done' || st === 'partial' || st === 'missed') && <small>{day}</small>}
              </button>
            );
          })}
        </div>
        <div className="legend">
          <div><i className="f" />모두 드심</div>
          <div><i className="o" />일부 놓침</div>
          <div><i className="x" />못 드심</div>
        </div>
        {rate.percent != null && (
          <p className="cal-rate">
            이번 달 복용률 <b>{rate.percent}%</b> ({rate.taken}/{rate.due}번)
          </p>
        )}
      </section>

      <h2 className="section-title">{dateLabel(selected)}</h2>
      {selSlots.length === 0 ? (
        <p className="empty" style={{ marginTop: 0 }}>이날은 드실 약이 없었어요</p>
      ) : (
        <ul className="slots" style={{ listStyle: 'none', padding: 0 }}>
          {selSlots.map((s) => {
            const isPast = selected < today || (selected === today && s.minutes <= now);
            const isFuture = selected > today;
            return (
              <li key={s.minutes} className="slot slot-col">
                <div className="slot-row">
                  <span className="label">{s.label}</span>
                  <span className="time">{formatTime(s.minutes)}</span>
                  {s.taken ? (
                    <span className="state ok">
                      <Icon name="check" size={18} />
                      드셨어요
                    </span>
                  ) : isFuture ? (
                    <span className="state">예정</span>
                  ) : (
                    <>
                      {isPast && <span className="state warn">놓쳤어요</span>}
                      <button type="button" className="chip-btn" onClick={() => takeSlot(s.minutes, selected)}>
                        먹었어요
                      </button>
                    </>
                  )}
                </div>
                <div className="slot-meds">
                  {s.items.map((i) => (
                    <span key={i.key} className={i.taken ? 'is-taken' : ''}>
                      {i.taken ? <Icon name="check" size={12} strokeWidth={3} /> : <i style={{ background: medColor(i.med).fg }} />}
                      {i.med.name} {i.med.dose}
                      {i.taken && (
                        <>
                          <em>{new Date(i.takenAt).toTimeString().slice(0, 5)}</em>
                          <button
                            type="button"
                            className="undo"
                            aria-label={`${i.med.name} 기록 취소`}
                            onClick={() => {
                              if (window.confirm(`${i.med.name} 복용 기록을 취소할까요?`)) untakeDose(doseKey(i.med.id, s.minutes), selected);
                            }}
                          >
                            <Icon name="close" size={12} strokeWidth={3} />
                          </button>
                        </>
                      )}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Bar({ label, rate }) {
  const p = rate.percent;
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <span className="bar-track" role="img" aria-label={`${label} ${p == null ? '기록 없음' : `${p}%`}`}>
        <span className={`bar-fill ${p != null && p < 80 ? 'low' : ''}`} style={{ width: `${p ?? 0}%` }} />
      </span>
      <span className="bar-val">{p == null ? '-' : `${p}%`}</span>
    </div>
  );
}

function Rates({ ctx }) {
  const { data, today, now } = ctx;
  const [mode, setMode] = useState('week');
  const rate = (from, to, meds = data.meds) => rateBetween(meds, data.logs, from, to, today, now);

  let from;
  let to;
  let rows;
  if (mode === 'week') {
    from = weekStart(today);
    to = addDays(from, 6);
    rows = Array.from({ length: 7 }, (_, i) => {
      const k = addDays(from, i);
      return { label: `${WEEKDAYS[weekdayOf(k)]}`, rate: rate(k, k) };
    });
  } else {
    from = monthStart(today);
    to = monthEnd(today);
    rows = [];
    for (let ws = weekStart(from); ws <= to; ws = addDays(ws, 7)) {
      const a = ws < from ? from : ws;
      const b = addDays(ws, 6) > to ? to : addDays(ws, 6);
      rows.push({ label: `${Number(a.slice(8))}~${Number(b.slice(8))}일`, rate: rate(a, b) });
    }
  }
  const total = rate(from, to);
  const perMed = data.meds
    .map((m) => ({ med: m, rate: rate(from, to, [m]) }))
    .filter((x) => x.rate.due > 0);

  return (
    <>
      <div className="chips pad" role="group" aria-label="기간" style={{ marginTop: 16 }}>
        <button type="button" className={`chip-opt ${mode === 'week' ? 'is-on' : ''}`} aria-pressed={mode === 'week'} onClick={() => setMode('week')}>이번 주</button>
        <button type="button" className={`chip-opt ${mode === 'month' ? 'is-on' : ''}`} aria-pressed={mode === 'month'} onClick={() => setMode('month')}>이번 달</button>
      </div>

      <section className="summary" aria-label="복용률 요약">
        <div className="k">
          {shortLabel(from)} ~ {shortLabel(to)}
        </div>
        <div className="big">
          <b>{total.percent ?? '-'}</b>
          <span>% · {total.taken}/{total.due}번 드셨어요</span>
        </div>
      </section>

      <section className="card bars">
        <h3>{mode === 'week' ? '요일별' : '주별'}</h3>
        {rows.map((r) => (
          <Bar key={r.label} label={r.label} rate={r.rate} />
        ))}
      </section>

      {perMed.length > 0 && (
        <section className="card bars" style={{ marginBottom: 20 }}>
          <h3>약별</h3>
          {perMed.map((x) => (
            <Bar key={x.med.id} label={x.med.name} rate={x.rate} />
          ))}
        </section>
      )}
    </>
  );
}

export default function History({ ctx }) {
  const [tab, setTab] = useState('calendar');
  return (
    <main className="screen">
      <header className="top">
        <h1 className="title">복용이력</h1>
      </header>
      <div className="seg tabs-inline" role="group" aria-label="보기 방식">
        <button type="button" aria-pressed={tab === 'calendar'} onClick={() => setTab('calendar')}>
          달력
        </button>
        <button type="button" aria-pressed={tab === 'rate'} onClick={() => setTab('rate')}>
          복용률
        </button>
      </div>
      {tab === 'calendar' ? <Calendar ctx={ctx} /> : <Rates ctx={ctx} />}
      <div style={{ height: 20 }} />
      <TabBar current="history" />
    </main>
  );
}
