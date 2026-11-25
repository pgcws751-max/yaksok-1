import Icon from '../components/Icon.jsx';
import MedIcon from '../components/MedIcon.jsx';
import TabBar from '../components/TabBar.jsx';
import { dateLabel, weekStart } from '../lib/date.js';
import { missedBetween, rateBetween, slotsOn, streakDays } from '../lib/schedule.js';
import { navigate } from '../router.js';
import { MEAL_TEXT, formatTime, formatUntil } from '../time.js';

function Ring({ value, total }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const p = total ? value / total : 0;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`${total}번 중 ${value}번 복용`}>
      <circle cx="42" cy="42" r={r} fill="none" stroke="#EEF0F3" strokeWidth="10" />
      {value > 0 && <circle
        cx="42" cy="42" r={r} fill="none" stroke="#18C37E" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 42 42)" style={{ transition: 'stroke-dasharray 0.4s' }}
      />}
      <text x="42" y="47" textAnchor="middle" fontSize="15" fontWeight="800" fill="#191F28">
        {value}/{total}
      </text>
    </svg>
  );
}

export default function Home({ ctx }) {
  const { data, today, now, takeSlot, takeDose, untakeDose, user } = ctx;
  const slots = slotsOn(data.meds, data.logs, today);
  const doses = slots.flatMap((s) => s.items);
  const takenCount = doses.filter((d) => d.taken).length;
  const next = slots.find((s) => !s.taken) ?? null;
  const score = doses.length ? Math.round((takenCount / doses.length) * 100) : 0;

  const ws = weekStart(today);
  const weekRate = rateBetween(data.meds, data.logs, ws, today, today, now).percent;
  const weekMissed = missedBetween(data.meds, data.logs, ws, today, today, now);
  const streak = streakDays(data.meds, data.logs, today, now);

  let scoreHint = '오늘 약을 모두 드셨어요';
  if (next) {
    const after = takenCount + next.items.filter((i) => !i.taken).length;
    scoreHint = `${next.label} 약까지 먹으면 ${Math.round((after / doses.length) * 100)}점이에요`;
  }

  let whenText = '';
  let late = false;
  if (next) {
    const diff = next.minutes - now;
    late = diff < 0;
    whenText = late ? `${formatUntil(-diff).replace(' 뒤', '')} 지났어요` : formatUntil(diff);
  }
  const nextTodo = next ? next.items.filter((i) => !i.taken) : [];
  const nextMeals = next ? [...new Set(next.items.map((i) => MEAL_TEXT[i.med.meal]).filter(Boolean))] : [];

  const header = (
    <header className="c-top">
      <div>
        <div className="eyebrow">{dateLabel(today)}</div>
        <h1 className="c-hello">{user.name}님, 오늘도 약속을 지켜요</h1>
      </div>
      <div className="c-top-actions">
        <button type="button" className="icon-btn" aria-label="복용이력" onClick={() => navigate('/history')}>
          <Icon name="calendar" size={22} strokeWidth={2} />
        </button>
        <button type="button" className="icon-btn" aria-label="알림 설정" onClick={() => navigate('/settings/notify')}>
          <Icon name="bell" size={22} strokeWidth={2} />
        </button>
      </div>
    </header>
  );

  if (!data.meds.length || !slots.length) {
    return (
      <main className="screen">
        {header}
        <section className="card c-empty">
          <b>{data.meds.length ? '오늘은 드실 약이 없어요' : '먼저 드시는 약을 등록해 주세요'}</b>
          <p>{data.meds.length ? '편안한 하루 보내세요' : '시간이 되면 알려 드리고, 복용 기록도 남겨 드려요'}</p>
          {!data.meds.length && (
            <button type="button" className="btn-primary with-icon" onClick={() => navigate('/meds/new')}>
              <Icon name="plus" size={20} />
              약 등록하기
            </button>
          )}
        </section>
        <TabBar current="home" />
      </main>
    );
  }

  return (
    <main className="screen">
      {header}

      <section className="card score-card" aria-label="오늘 복용 현황">
        <div className="score-head">
          <div>
            <div className="k">오늘의 복약 점수</div>
            <div className="score-num">
              {score}
              <span>점</span>
            </div>
            <div className="score-hint">{scoreHint}</div>
          </div>
          <Ring value={takenCount} total={doses.length} />
        </div>
        <div className="stat-grid">
          <div className="stat">
            <span>연속 복용</span>
            <b>{streak}일</b>
          </div>
          <div className="stat">
            <span>이번 주</span>
            <b className="good">{weekRate == null ? '-' : `${weekRate}%`}</b>
          </div>
          <div className="stat">
            <span>놓친 약</span>
            <b className={weekMissed ? 'bad' : ''}>{weekMissed}번</b>
          </div>
        </div>
      </section>

      {next ? (
        <section className="card dose-card" aria-label="다음 약">
          <div className="dose-head">
            <b>
              {next.label} <span>{formatTime(next.minutes)}{nextMeals.length > 0 && ` · ${nextMeals.join('/')}`}</span>
            </b>
            <em className={late ? 'bad' : ''}>{whenText}</em>
          </div>
          {next.items.map((i) => (
            <div className="dose-row" key={i.key}>
              <MedIcon med={i.med} size={44} />
              <div className="dose-txt">
                <b>{i.med.name}</b>
                <span>{i.med.dose}{i.med.memo && ` · ${i.med.memo}`}</span>
              </div>
              <button
                type="button"
                className={`check-btn ${i.taken ? 'is-on' : ''}`}
                aria-pressed={i.taken}
                aria-label={i.taken ? `${i.med.name} 기록 취소` : `${i.med.name} 먹었어요`}
                onClick={() => {
                  if (!i.taken) takeDose(i.key);
                  else if (window.confirm(`${i.med.name} 복용 기록을 취소할까요?`)) untakeDose(i.key);
                }}
              >
                <Icon name="check" size={20} strokeWidth={3} />
              </button>
            </div>
          ))}
          <button type="button" className="btn-primary" onClick={() => takeSlot(next.minutes)}>
            {nextTodo.length > 1 ? `${nextTodo.length}개 다 먹었어요` : '먹었어요'}
          </button>
        </section>
      ) : (
        <section className="card c-empty">
          <b>오늘 약을 모두 드셨어요</b>
          <p>내일 다시 알려 드릴게요</p>
        </section>
      )}

      <ul className="mini-slots">
        {slots
          .filter((s) => s.minutes !== next?.minutes)
          .map((s) => {
            const missed = !s.taken && s.minutes < now;
            return (
              <li key={s.minutes} className="card mini-slot">
                <span className={`mini-dot ${s.taken ? 'done' : missed ? 'bad' : ''}`} aria-hidden="true">
                  {s.taken && <Icon name="check" size={14} strokeWidth={3.5} />}
                  {missed && '!'}
                </span>
                <span className="mini-txt">
                  <span>
                    <b>{s.label}</b> {formatTime(s.minutes)}
                  </span>
                  <small>{s.taken ? `${s.items.length}개 완료` : s.items.map((i) => i.med.name).join(' · ')}</small>
                </span>
                {missed ? (
                  <button type="button" className="chip-btn" onClick={() => takeSlot(s.minutes)}>
                    먹었어요
                  </button>
                ) : (
                  <span className={`mini-state ${s.taken ? 'good' : ''}`}>{s.taken ? '완료' : '예정'}</span>
                )}
              </li>
            );
          })}
      </ul>

      {next && (
        <button type="button" className="btn-text" style={{ margin: '0 auto 12px' }} onClick={() => navigate(`/alarm/${next.minutes}`)}>
          알림 화면 미리보기
        </button>
      )}

      <TabBar current="home" />
    </main>
  );
}
