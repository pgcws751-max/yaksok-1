import Icon from '../../components/Icon.jsx';
import MedIcon from '../../components/MedIcon.jsx';
import TabBar from '../../components/TabBar.jsx';
import { WEEKDAYS, shortLabel } from '../../lib/date.js';
import { navigate } from '../../router.js';
import { MEAL_TEXT, formatTime } from '../../time.js';

export function daysText(days) {
  if (days.length === 7) return '매일';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return '평일';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return '주말';
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => WEEKDAYS[d]).join('·');
}

function status(med, today) {
  if (med.startDate > today) return { text: `${shortLabel(med.startDate)}부터`, cls: 'wait' };
  if (med.endDate && med.endDate < today) return { text: '복용 끝', cls: 'end' };
  return { text: '복용 중', cls: 'on' };
}

export default function MedList({ ctx }) {
  const { data, today } = ctx;
  const meds = [...data.meds].sort((a, b) => {
    const order = { on: 0, wait: 1, end: 2 };
    return order[status(a, today).cls] - order[status(b, today).cls] || a.name.localeCompare(b.name, 'ko');
  });

  return (
    <main className="screen">
      <header className="top">
        <div className="eyebrow">약 {data.meds.length}개</div>
        <h1 className="title">약 관리</h1>
      </header>

      <div className="pad" style={{ marginTop: 16 }}>
        <button type="button" className="btn-primary with-icon" onClick={() => navigate('/meds/new')}>
          <Icon name="plus" size={22} />
          약 등록하기
        </button>
      </div>

      {meds.length === 0 ? (
        <p className="empty">아직 등록한 약이 없어요.<br />위 버튼을 눌러 드시는 약을 넣어 주세요.</p>
      ) : (
        <ul className="med-list">
          {meds.map((m) => {
            const st = status(m, today);
            return (
              <li key={m.id}>
                <button type="button" className={`card med-card ${st.cls === 'end' ? 'is-end' : ''}`} onClick={() => navigate(`/meds/${m.id}`)}>
                  <MedIcon med={m} size={44} />
                  <div className="med-card-main">
                  <div className="med-card-head">
                    <b>{m.name}</b>
                    <span className="dose">{m.dose}</span>
                    <span className={`badge ${st.cls}`}>{st.text}</span>
                  </div>
                  <div className="med-card-body">
                    <span>
                      <Icon name="clock" size={16} />
                      {m.times.length ? m.times.map(formatTime).join(', ') : '시간 미정'}
                    </span>
                    <span>
                      <Icon name="calendar" size={16} />
                      {daysText(m.days)}
                      {MEAL_TEXT[m.meal] && ` · ${MEAL_TEXT[m.meal]}`}
                      {m.endDate && ` · ${shortLabel(m.endDate)}까지`}
                    </span>
                  </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <TabBar current="meds" />
    </main>
  );
}
