import Icon from '../components/Icon.jsx';
import MedIcon from '../components/MedIcon.jsx';
import { slotsOn, streakDays } from '../lib/schedule.js';
import { navigate } from '../router.js';
import { MEAL_TEXT, formatTime } from '../time.js';

export default function Alarm({ ctx, minutes }) {
  const { data, today, now, takeSlot, snooze } = ctx;
  const slot = slotsOn(data.meds, data.logs, today).find((s) => s.minutes === minutes);
  const home = () => navigate('/home', { replace: true });

  if (!slot || slot.taken) {
    return (
      <main className="alarm">
        <div className="done-msg">{slot ? '이 시간 약은 이미 드셨어요' : '이 시간에 드실 약이 없어요'}</div>
        <div className="actions">
          <button type="button" className="btn-primary" onClick={home}>
            홈으로
          </button>
        </div>
      </main>
    );
  }

  const todo = slot.items.filter((i) => !i.taken);
  const memos = todo.map((i) => i.med.memo).filter(Boolean);
  const meals = [...new Set(todo.map((i) => MEAL_TEXT[i.med.meal]).filter(Boolean))];
  const streak = streakDays(data.meds, data.logs, today, now);

  return (
    <main className="alarm" role="alertdialog" aria-labelledby="alarm-title">
      <div className="alarm-top">
        <span className="tag">
          <Icon name="bell" size={14} strokeWidth={2.4} />
          복용 알림
        </span>
        <button type="button" className="icon-btn" aria-label="닫기" onClick={home}>
          <Icon name="close" size={22} strokeWidth={2.2} />
        </button>
      </div>

      <h1 id="alarm-title" className="alarm-title">
        {slot.label} 약 드실
        <br />
        시간이에요
      </h1>
      <p className="alarm-sub">
        {formatTime(slot.minutes)}
        {meals.length > 0 && ` · ${meals.join('/')}에 드세요`}
      </p>

      <section className="card alarm-meds" aria-label="지금 드실 약">
        {todo.map((i) => (
          <div className="dose-row" key={i.key}>
            <MedIcon med={i.med} size={48} />
            <div className="dose-txt">
              <b>{i.med.name}</b>
              <span>{i.med.dose}</span>
            </div>
          </div>
        ))}
        {memos.length > 0 && <p className="alarm-note">{memos.join(' · ')}</p>}
      </section>

      {streak > 0 && (
        <section className="card alarm-streak">
          <b>{streak}일</b>
          <span>
            연속으로 약속을 지키고 있어요.
            <br />
            오늘도 이어가 볼까요?
          </span>
        </section>
      )}

      <div className="alarm-actions">
        <button
          type="button"
          className="btn-soft"
          onClick={() => {
            snooze(slot.minutes);
            home();
          }}
        >
          {data.settings.remindMinutes}분 뒤
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            takeSlot(slot.minutes);
            home();
          }}
        >
          {todo.length > 1 ? `${todo.length}개 다 먹었어요` : '먹었어요'}
        </button>
      </div>
    </main>
  );
}
