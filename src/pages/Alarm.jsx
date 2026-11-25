import Icon from '../components/Icon.jsx';
import MedIcon from '../components/MedIcon.jsx';
import { slotsOn } from '../lib/schedule.js';
import { navigate } from '../router.js';
import { MEAL_TEXT, splitTime } from '../time.js';

export default function Alarm({ ctx, minutes }) {
  const { data, today, takeSlot, snooze } = ctx;
  const slot = slotsOn(data.meds, data.logs, today).find((s) => s.minutes === minutes);
  const home = () => navigate('/home', { replace: true });

  if (!slot || slot.taken) {
    return (
      <main className="alarm">
        <div className="done-msg">{slot ? '이 시간 약은 이미 드셨어요' : '이 시간에 드실 약이 없어요'}</div>
        <div className="actions">
          <button type="button" className="btn-big" onClick={home}>
            홈으로
          </button>
        </div>
      </main>
    );
  }

  const { period, clock } = splitTime(slot.minutes);
  const todo = slot.items.filter((i) => !i.taken);
  const memos = todo.map((i) => i.med.memo).filter(Boolean);
  const meals = [...new Set(todo.map((i) => MEAL_TEXT[i.med.meal]).filter(Boolean))];

  return (
    <main className="alarm" role="alertdialog" aria-labelledby="alarm-title">
      <div className="chip" id="alarm-title">
        <Icon name="bell" size={20} strokeWidth={2.4} />
        {slot.label} 약 드실 시간
      </div>

      <div className="clock">
        <div className="period">{period}</div>
        <h1>{clock}</h1>
      </div>

      <section className="meds" aria-label="지금 드실 약">
        <div className="k">지금 드실 약{meals.length > 0 && ` · ${meals.join('/')}`}</div>
        {todo.map((i) => (
          <div className="med" key={i.key}>
            <MedIcon med={i.med} />
            <span className="n">{i.med.name}</span>
            <span className="c">{i.med.dose}</span>
          </div>
        ))}
        {memos.length > 0 && <div className="note">{memos.join(' · ')}</div>}
      </section>

      <div className="actions">
        <button
          type="button"
          className="btn-big"
          onClick={() => {
            takeSlot(slot.minutes);
            home();
          }}
        >
          <Icon name="check" size={24} />
          먹었어요
        </button>
        <button
          type="button"
          className="btn-ghost-light"
          onClick={() => {
            snooze(slot.minutes);
            home();
          }}
        >
          {data.settings.remindMinutes}분 뒤에 다시 알려주세요
        </button>
        <button type="button" className="btn-text light" onClick={home}>
          닫기
        </button>
      </div>
    </main>
  );
}
