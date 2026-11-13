import Icon from '../components/Icon.jsx';
import { GUARDIAN_NOTICE_MINUTES, SNOOZE_MINUTES } from '../data.js';
import { splitTime } from '../time.js';

export default function Alarm({ slot, onTake, onSnooze, onClose }) {
  if (!slot) {
    return (
      <main className="alarm">
        <div className="done-msg">오늘 드실 약이 더 없어요</div>
        <div className="actions">
          <button type="button" className="btn-big" onClick={onClose}>
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  const { period, clock } = splitTime(slot.minutes);

  return (
    <main className="alarm" role="alertdialog" aria-labelledby="alarm-title">
      <div className="chip" id="alarm-title">
        <Icon name="bell" size={26} strokeWidth={2.4} />
        {slot.label} 약 드실 시간
      </div>

      <div className="clock">
        <div className="period">{period}</div>
        <h1>{clock}</h1>
      </div>

      <section className="meds" aria-label="지금 드실 약">
        <div className="k">지금 드실 약</div>
        {slot.pills.map((p) => (
          <div className="med" key={p.name}>
            <span className="ic">
              <Icon name="pill" size={26} strokeWidth={2.4} />
            </span>
            <span className="n">{p.name}</span>
            <span className="c">{p.count}알</span>
          </div>
        ))}
        {slot.note && <div className="note">{slot.note}</div>}
      </section>

      <div className="actions">
        <button type="button" className="btn-big" onClick={() => onTake(slot.id)}>
          <Icon name="check" size={36} />
          먹었어요
        </button>
        <button type="button" className="btn-ghost-light" onClick={onSnooze}>
          {SNOOZE_MINUTES}분 뒤에 다시 알려주세요
        </button>
        <p className="guard" style={{ margin: 0 }}>
          {GUARDIAN_NOTICE_MINUTES}분 안에 누르지 않으면
          <br />
          보호자께 알려드려요
        </p>
      </div>
    </main>
  );
}
