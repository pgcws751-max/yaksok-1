import Icon from '../components/Icon.jsx';
import TabBar from '../components/TabBar.jsx';
import { dateLabel } from '../lib/date.js';
import { slotsOn } from '../lib/schedule.js';
import { navigate } from '../router.js';
import { MEAL_TEXT, formatTime, formatUntil } from '../time.js';

function pillLine(items) {
  return items.map((i) => `${i.med.name} ${i.med.dose}`).join(' · ');
}

export default function Home({ ctx }) {
  const { data, today, now, takeSlot, untakeDose, user } = ctx;
  const slots = slotsOn(data.meds, data.logs, today);
  const doses = slots.flatMap((s) => s.items);
  const takenCount = doses.filter((d) => d.taken).length;
  const next = slots.find((s) => !s.taken) ?? null;
  const nextMeals = next ? [...new Set(next.items.map((i) => MEAL_TEXT[i.med.meal]).filter(Boolean))] : [];

  let whenText = '';
  if (next) {
    const diff = next.minutes - now;
    whenText = diff < 0 ? `${formatUntil(-diff).replace(' 뒤', '')} 지났어요` : formatUntil(diff);
  }

  return (
    <main className="screen">
      <header className="top">
        <div className="eyebrow">{dateLabel(today)}</div>
        <h1 className="title">{user.name}님, 오늘도 약속을 지켜요</h1>
      </header>

      {!data.meds.length ? (
        <section className="next all-done" aria-label="시작하기">
          <div className="name">먼저 드시는 약을 등록해 주세요</div>
          <div className="pills">시간이 되면 알려 드릴게요</div>
          <button type="button" className="btn-white" onClick={() => navigate('/meds/new')}>
            <Icon name="plus" size={28} />
            약 등록하기
          </button>
        </section>
      ) : !slots.length ? (
        <section className="next all-done" aria-label="오늘">
          <div className="name">오늘은 드실 약이 없어요</div>
          <div className="pills">편안한 하루 보내세요</div>
        </section>
      ) : (
        <>
          <section className="card progress" aria-label="오늘 복용 현황">
            <strong>
              오늘 {doses.length}번 중 {takenCount}번
            </strong>
            <div className="dots" aria-hidden="true">
              {slots.map((s) => (
                <span key={s.minutes} className={`dot ${s.taken ? 'done' : 'todo'}`}>
                  {s.taken && <Icon name="check" size={18} />}
                </span>
              ))}
            </div>
          </section>

          {next ? (
            <section className={`next ${next.minutes < now ? 'late' : ''}`} aria-label="다음 약">
              <div className="k">{next.minutes <= now ? '지금 드세요' : '다음 약'}</div>
              <div className="name">{next.label} 약</div>
              <div className="when">
                {formatTime(next.minutes)} · {whenText}
              </div>
              <div className="pills">
                {pillLine(next.items.filter((i) => !i.taken))}
                {nextMeals.length > 0 && ` (${nextMeals.join('/')})`}
              </div>
              <button type="button" className="btn-white" onClick={() => takeSlot(next.minutes)}>
                <Icon name="check" size={30} />
                먹었어요
              </button>
            </section>
          ) : (
            <section className="next all-done" aria-label="다음 약">
              <div className="k">오늘</div>
              <div className="name">오늘 약을 모두 드셨어요</div>
              <div className="pills">내일 다시 알려 드릴게요</div>
            </section>
          )}

          <h2 className="section-title">오늘 일정</h2>
          <ul className="slots" style={{ listStyle: 'none', padding: 0 }}>
            {slots.map((s) => {
              const isNext = next?.minutes === s.minutes;
              return (
                <li key={s.minutes} className={`slot slot-col ${isNext ? 'is-next' : ''}`}>
                  <div className="slot-row">
                    <span className="label">{s.label}</span>
                    <span className="time">{formatTime(s.minutes)}</span>
                    {s.taken ? (
                      <span className="state ok">
                        <Icon name="check" size={22} />
                        먹었어요
                      </span>
                    ) : isNext ? (
                      <span className="state upcoming">다음 차례</span>
                    ) : s.minutes < now ? (
                      <button type="button" className="chip-btn" onClick={() => takeSlot(s.minutes)}>
                        먹었어요
                      </button>
                    ) : (
                      <span className="state">예정</span>
                    )}
                  </div>
                  <div className="slot-meds">
                    {s.items.map((i) => (
                      <span key={i.key} className={i.taken ? 'is-taken' : ''}>
                        {i.med.name} {i.med.dose}
                        {i.taken && (
                          <button
                            type="button"
                            className="undo"
                            aria-label={`${i.med.name} 기록 취소`}
                            onClick={() => {
                              if (window.confirm(`${s.label} ${i.med.name} 복용 기록을 취소할까요?`)) untakeDose(i.key);
                            }}
                          >
                            <Icon name="close" size={16} strokeWidth={3} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          {next && (
            <div className="pad" style={{ paddingBottom: 20 }}>
              <button type="button" className="btn-outline" onClick={() => navigate(`/alarm/${next.minutes}`)}>
                알림 화면 미리보기
              </button>
            </div>
          )}
        </>
      )}

      <TabBar current="home" />
    </main>
  );
}
