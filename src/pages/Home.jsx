import Icon from '../components/Icon.jsx';
import TabBar from '../components/TabBar.jsx';
import { TODAY_LABEL, formatTime, formatUntil, pillSummary } from '../time.js';

export default function Home({ slots, nextSlot, now, onTake, onPreviewAlarm, onNavigate }) {
  const active = slots.filter((s) => s.enabled);
  const takenCount = active.filter((s) => s.taken).length;

  return (
    <main className="screen">
      <header className="top">
        <div className="eyebrow">{TODAY_LABEL}</div>
        <h1 className="title">오늘도 약속을 지켜요</h1>
      </header>

      <section className="card progress" aria-label="오늘 복용 현황">
        <strong>
          오늘 {active.length}번 중 {takenCount}번
        </strong>
        <div className="dots" aria-hidden="true">
          {active.map((s) => (
            <span key={s.id} className={`dot ${s.taken ? 'done' : 'todo'}`}>
              {s.taken && <Icon name="check" size={18} />}
            </span>
          ))}
        </div>
      </section>

      {nextSlot ? (
        <section className="next" aria-label="다음 약">
          <div className="k">다음 약</div>
          <div className="name">{nextSlot.label} 약</div>
          <div className="when">
            {formatTime(nextSlot.minutes)} · {formatUntil(nextSlot.minutes - now)}
          </div>
          <div className="pills">{pillSummary(nextSlot.pills)}</div>
          <button type="button" className="btn-white" onClick={() => onTake(nextSlot.id)}>
            <Icon name="check" size={30} />
            먹었어요
          </button>
        </section>
      ) : (
        <section className="next all-done" aria-label="다음 약">
          <div className="k">오늘</div>
          <div className="name">오늘 약을 모두 드셨어요</div>
          <div className="pills">내일 아침에 다시 알려드릴게요</div>
        </section>
      )}

      <h2 className="section-title">오늘 일정</h2>
      <ul className="slots" style={{ listStyle: 'none', padding: 0 }}>
        {slots.map((s) => {
          const isNext = nextSlot?.id === s.id;
          let state = <span className="state">예정</span>;
          if (!s.enabled) state = <span className="state">알림 꺼짐</span>;
          else if (s.taken)
            state = (
              <span className="state ok">
                <Icon name="check" size={22} />
                먹었어요
              </span>
            );
          else if (isNext) state = <span className="state upcoming">다음 차례</span>;

          return (
            <li
              key={s.id}
              className={`slot ${isNext ? 'is-next' : ''} ${!s.enabled ? 'is-off' : ''}`}
            >
              <span className="label">{s.label}</span>
              <span className="time">{formatTime(s.minutes)}</span>
              {state}
            </li>
          );
        })}
      </ul>

      {nextSlot && (
        <div className="pad" style={{ paddingBottom: 20 }}>
          <button type="button" className="btn-outline" onClick={onPreviewAlarm}>
            알림 화면 미리보기
          </button>
        </div>
      )}

      <TabBar current="home" onNavigate={onNavigate} />
    </main>
  );
}
