import Icon from '../components/Icon.jsx';
import TabBar from '../components/TabBar.jsx';
import {
  MISSED,
  WEEK,
  WEEK_RANGE,
  WEEK_TAKEN_BEFORE_TODAY,
  WEEK_TOTAL_BEFORE_TODAY,
} from '../data.js';
import { formatTime } from '../time.js';

const STATUS_TEXT = {
  done: '모두 드심',
  missed: '놓친 약 있음',
  today: '오늘',
  future: '아직',
};

export default function History({ slots, onShare, onNavigate }) {
  // 오늘 드신 횟수를 이번 주 합계에 더합니다.
  const todayTaken = slots.filter((s) => s.enabled && s.taken).length;
  const taken = WEEK_TAKEN_BEFORE_TODAY + todayTaken;
  const total = WEEK_TOTAL_BEFORE_TODAY + todayTaken; // 지금까지 시간이 된 약 기준

  return (
    <main className="screen">
      <header className="top">
        <div className="eyebrow">{WEEK_RANGE}</div>
        <h1 className="title">이번 주 복용 기록</h1>
      </header>

      <section className="summary" aria-label="이번 주 요약">
        <div className="k">지금까지</div>
        <div className="big">
          <b>{taken}</b>
          <span>/ {total}번 드셨어요</span>
        </div>
      </section>

      <section className="card week" aria-label="요일별 기록">
        <ul className="days" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {WEEK.map((d) => (
            <li key={d.day} className={`day ${d.status}`}>
              <span>{d.day}</span>
              <span className={`mark ${d.status}`} role="img" aria-label={`${d.day} ${STATUS_TEXT[d.status]}`}>
                {d.status === 'done' && <Icon name="check" size={22} />}
                {d.status === 'missed' && '!'}
                {d.status === 'today' && d.date}
              </span>
            </li>
          ))}
        </ul>
        <div className="legend">
          <div>
            <i className="f" />
            체크 : 그날 약을 모두 드셨어요
          </div>
          <div>
            <i className="o" />
            느낌표 : 놓친 약이 있어요
          </div>
        </div>
      </section>

      {MISSED.map((m) => (
        <div className="card missed-item" key={m.title}>
          <span className="mark missed" aria-hidden="true">
            !
          </span>
          <div>
            <b>{m.title}</b>
            <span>{formatTime(m.minutes)} · 놓쳤어요</span>
          </div>
        </div>
      ))}

      <div className="pad" style={{ margin: '14px 0 20px' }}>
        <button type="button" className="btn-outline" onClick={onShare}>
          기록을 가족에게 보내기
        </button>
      </div>

      <TabBar current="history" onNavigate={onNavigate} />
    </main>
  );
}
