import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import VoiceOverlay from '../../components/VoiceOverlay.jsx';
import { addDays, dateLabel } from '../../lib/date.js';
import { COMMON_MEDS, DOSES, DURATIONS, MED_VOICE_SAMPLES, SLOTS, describeParsed, parseMedSpeech } from '../../lib/medVoice.js';
import { newId } from '../../lib/storage.js';
import { goBack, navigate } from '../../router.js';
import { formatTime } from '../../time.js';

const MEALS = [
  { id: 'after', label: '식후', desc: '밥 먹고 나서' },
  { id: 'before', label: '식전', desc: '밥 먹기 전에' },
  { id: 'any', label: '상관없음', desc: '아무 때나' },
];
const STEPS = ['약 이름', '먹는 때', '한 번에 얼마나', '언제부터 언제까지', '확인'];
const ICON_COLOR = { sunrise: '#D9811A', sun: '#D9811A', moon: '#4F5BD5' };

// 새 약 등록: 고르기 + 말하기
export default function MedWizard({ ctx }) {
  const { update, today, toast } = ctx;
  const [step, setStep] = useState(0);
  const [voice, setVoice] = useState(null); // 'all' | 'step'
  const [f, setF] = useState({
    name: '',
    slots: {}, // { morning: 480, ... } 고른 시간대만
    dose: '1알',
    meal: 'after',
    startDate: today,
    duration: 'ongoing',
    durationDays: null,
    endDate: '',
  });
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const valid = [f.name.trim().length > 0, Object.keys(f.slots).length > 0, !!f.dose, !!f.startDate && (f.duration !== 'custom' || (f.endDate && f.endDate >= f.startDate)), true];

  const endDate = () => {
    if (f.duration === 'ongoing') return null;
    if (f.duration === 'custom') return f.endDate || null;
    const days = f.durationDays || DURATIONS.find((d) => d.id === f.duration)?.days;
    return days ? addDays(f.startDate, days - 1) : null;
  };

  // 말한 내용을 채워 넣기
  const applyVoice = (text, all) => {
    const p = parseMedSpeech(text, today);
    const patch = {};
    if (p.name && (all || step === 0)) patch.name = p.name;
    if (p.slots) patch.slots = Object.fromEntries(p.slots.map((id) => [id, f.slots[id] ?? SLOTS.find((s) => s.id === id).minutes]));
    if (p.dose) patch.dose = p.dose;
    if (p.meal) patch.meal = p.meal;
    if (p.startDate) patch.startDate = p.startDate;
    if (p.duration === 'ongoing') Object.assign(patch, { duration: 'ongoing', durationDays: null });
    if (p.durationDays) {
      const preset = DURATIONS.find((d) => d.days === p.durationDays);
      Object.assign(patch, preset ? { duration: preset.id, durationDays: null } : { duration: 'days', durationDays: p.durationDays });
    }
    const said = describeParsed(p);
    if (!said) {
      toast('잘 알아듣지 못했어요. 버튼으로 골라 주세요');
      return;
    }
    set(patch);
    toast(`알아들었어요: ${said}`);
    if (all) {
      const next = { ...f, ...patch };
      // 이름과 먹는 때를 알아들었으면 바로 확인 화면, 아니면 빠진 단계로
      setStep(!next.name ? 0 : !Object.keys(next.slots).length ? 1 : 4);
    }
  };

  const toggleSlot = (s) => {
    const next = { ...f.slots };
    if (next[s.id] != null) delete next[s.id];
    else next[s.id] = s.minutes;
    set({ slots: next });
  };
  const shift = (id, d) => set({ slots: { ...f.slots, [id]: (f.slots[id] + d + 1440) % 1440 } });

  const save = () => {
    const times = [...new Set(Object.values(f.slots))].sort((a, b) => a - b);
    const med = { id: newId(), name: f.name.trim(), dose: f.dose, startDate: f.startDate, endDate: endDate(), memo: '', times, days: [0, 1, 2, 3, 4, 5, 6], meal: f.meal };
    update((d) => ({ ...d, meds: [...d.meds, med] }));
    toast(`${med.name}을(를) 등록했어요`);
    navigate('/meds', { replace: true });
  };

  const back = () => (step === 0 ? goBack('/meds') : setStep(step - 1));
  const slotList = SLOTS.filter((s) => f.slots[s.id] != null);
  const durationText =
    f.duration === 'ongoing' ? '끝나는 날 없이 계속' : `${dateLabel(endDate() || f.startDate)}까지`;

  const StepMic = ({ label = '말로 하기' }) => (
    <button type="button" className="wiz-mic" onClick={() => setVoice('step')}>
      <Icon name="mic" size={18} strokeWidth={2.4} />
      {label}
    </button>
  );

  return (
    <main className="screen wiz">
      <header className="wiz-top">
        <button type="button" className="back" onClick={back}>
          <Icon name="back" size={20} strokeWidth={2.6} />
          {step === 0 ? '닫기' : '이전'}
        </button>
        <span className="wiz-count">
          {step + 1} / {STEPS.length}
        </span>
      </header>
      <div className="wiz-bar" aria-hidden="true">
        <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {step === 0 && (
        <section className="wiz-body">
          <h1 className="wiz-q">어떤 약을 드세요?</h1>
          <button type="button" className="wiz-voice-all" onClick={() => setVoice('all')}>
            <span className="core">
              <Icon name="mic" size={30} color="#fff" strokeWidth={2.2} />
            </span>
            <span>
              <b>말로 한 번에 등록하기</b>
              <small>예: "혈압약 아침 저녁 한 알씩 식후 오늘부터"</small>
            </span>
          </button>
          <p className="wiz-or">또는 아래에서 고르세요</p>
          <div className="wiz-chips">
            {COMMON_MEDS.map((n) => (
              <button key={n} type="button" className={`chip-opt big ${f.name === n ? 'is-on' : ''}`} aria-pressed={f.name === n} onClick={() => set({ name: n })}>
                {n}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="wiz-name">목록에 없으면 직접 적기</label>
            <input id="wiz-name" value={f.name} placeholder="예: 아스피린" maxLength={60} onChange={(e) => set({ name: e.target.value })} />
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="wiz-body">
          <div className="wiz-qrow">
            <h1 className="wiz-q">언제 드세요?</h1>
            <StepMic />
          </div>
          <p className="wiz-sub">여러 개를 고를 수 있어요</p>
          <div className="wiz-slots">
            {SLOTS.map((s) => {
              const on = f.slots[s.id] != null;
              return (
                <div key={s.id} className={`wiz-slot ${on ? 'is-on' : ''}`}>
                  <button type="button" className="wiz-slot-btn" aria-pressed={on} onClick={() => toggleSlot(s)}>
                    <Icon name={s.icon} size={28} color={on ? '#fff' : ICON_COLOR[s.icon]} strokeWidth={2.2} />
                    <b>{s.label}</b>
                    <span>{formatTime(on ? f.slots[s.id] : s.minutes)}</span>
                    <span className="wiz-check" aria-hidden="true">
                      {on && <Icon name="check" size={16} strokeWidth={3.2} />}
                    </span>
                  </button>
                  {on && (
                    <div className="wiz-time">
                      <button type="button" aria-label={`${s.label} 10분 빠르게`} onClick={() => shift(s.id, -10)}>
                        <Icon name="minus" size={18} />
                      </button>
                      <span>시간 조절</span>
                      <button type="button" aria-label={`${s.label} 10분 늦게`} onClick={() => shift(s.id, 10)}>
                        <Icon name="plus" size={18} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="wiz-body">
          <div className="wiz-qrow">
            <h1 className="wiz-q">한 번에 얼마나 드세요?</h1>
            <StepMic />
          </div>
          <div className="wiz-grid3">
            {DOSES.map((d) => (
              <button key={d} type="button" className={`wiz-tile ${f.dose === d ? 'is-on' : ''}`} aria-pressed={f.dose === d} onClick={() => set({ dose: d })}>
                {d}
              </button>
            ))}
          </div>
          <h2 className="wiz-q2">밥과 함께</h2>
          <div className="wiz-grid3">
            {MEALS.map((m) => (
              <button key={m.id} type="button" className={`wiz-tile tall ${f.meal === m.id ? 'is-on' : ''}`} aria-pressed={f.meal === m.id} onClick={() => set({ meal: m.id })}>
                <b>{m.label}</b>
                <small>{m.desc}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="wiz-body">
          <div className="wiz-qrow">
            <h1 className="wiz-q">언제부터 드세요?</h1>
            <StepMic />
          </div>
          <div className="wiz-grid3">
            {[
              { k: today, l: '오늘' },
              { k: addDays(today, 1), l: '내일' },
            ].map((o) => (
              <button key={o.l} type="button" className={`wiz-tile ${f.startDate === o.k ? 'is-on' : ''}`} aria-pressed={f.startDate === o.k} onClick={() => set({ startDate: o.k })}>
                {o.l}
              </button>
            ))}
            <label className={`wiz-tile date ${f.startDate !== today && f.startDate !== addDays(today, 1) ? 'is-on' : ''}`}>
              날짜 고르기
              <input type="date" value={f.startDate} min={addDays(today, -365)} onChange={(e) => e.target.value && set({ startDate: e.target.value })} aria-label="시작 날짜" />
            </label>
          </div>
          <p className="wiz-sub">{dateLabel(f.startDate)}부터</p>

          <h2 className="wiz-q2">언제까지 드세요?</h2>
          <div className="wiz-grid3">
            {DURATIONS.map((d) => (
              <button key={d.id} type="button" className={`wiz-tile ${f.duration === d.id ? 'is-on' : ''}`} aria-pressed={f.duration === d.id} onClick={() => set({ duration: d.id, durationDays: null })}>
                {d.label}
              </button>
            ))}
            <label className={`wiz-tile date ${f.duration === 'custom' ? 'is-on' : ''}`}>
              날짜 고르기
              <input type="date" value={f.endDate} min={f.startDate} onChange={(e) => set({ duration: 'custom', endDate: e.target.value, durationDays: null })} aria-label="끝나는 날짜" />
            </label>
          </div>
          <p className="wiz-sub">
            {f.duration === 'days' ? `${f.durationDays}일 동안 · ` : ''}
            {f.duration === 'custom' && !f.endDate ? '끝나는 날을 골라 주세요' : durationText}
          </p>
        </section>
      )}

      {step === 4 && (
        <section className="wiz-body">
          <h1 className="wiz-q">이렇게 등록할까요?</h1>
          <div className="card wiz-summary">
            {[
              { k: '약 이름', v: f.name, s: 0 },
              { k: '먹는 때', v: slotList.map((s) => `${s.label} ${formatTime(f.slots[s.id])}`).join('\n'), s: 1 },
              { k: '한 번에', v: `${f.dose} · ${MEALS.find((m) => m.id === f.meal).label}`, s: 2 },
              { k: '기간', v: `${dateLabel(f.startDate)}부터\n${durationText}`, s: 3 },
            ].map((r) => (
              <div key={r.k} className="wiz-row">
                <span>{r.k}</span>
                <b>{r.v}</b>
                <button type="button" className="chip-btn" onClick={() => setStep(r.s)}>
                  바꾸기
                </button>
              </div>
            ))}
          </div>
          <p className="wiz-sub">요일·메모는 등록한 뒤 약 관리에서 바꿀 수 있어요.</p>
        </section>
      )}

      <div className="wiz-foot">
        {step < 4 ? (
          <button type="button" className="btn-primary" disabled={!valid[step]} onClick={() => setStep(step + 1)}>
            {valid[step] ? '다음' : ['약 이름을 골라 주세요', '먹는 때를 골라 주세요', '용량을 골라 주세요', '날짜를 골라 주세요'][step]}
          </button>
        ) : (
          <button type="button" className="btn-primary with-icon" onClick={save}>
            <Icon name="check" size={20} strokeWidth={3} />
            등록하기
          </button>
        )}
      </div>

      {voice && (
        <VoiceOverlay
          samples={MED_VOICE_SAMPLES}
          title={voice === 'all' ? '약 이름, 먹는 때, 용량을 말씀해 주세요' : `${STEPS[step]}을(를) 말씀해 주세요`}
          hint={voice === 'all' ? '예: "혈압약 아침 저녁 한 알씩 식후 오늘부터"' : ['예: "혈압약"', '예: "아침 저녁"', '예: "한 알 식후"', '예: "오늘부터 한 달"'][step]}
          onCancel={() => setVoice(null)}
          onDone={(text) => {
            const all = voice === 'all';
            setVoice(null);
            applyVoice(text, all);
          }}
        />
      )}
    </main>
  );
}
