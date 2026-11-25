import { useState } from 'react';
import { uid } from '../../lib/storage.js';
import { navigate } from '../../router.js';
import { ErrorBox, Field, MenuRow, SubHeader } from '../../components/ui.jsx';
import { formatTime } from '../../time.js';
import { daysText } from './MedList.jsx';

const DOSE_CHIPS = ['1알', '2알', '반 알', '1포', '5ml'];

export default function MedEdit({ ctx, id }) {
  const { data, update, today, toast } = ctx;
  const existing = id ? data.meds.find((m) => m.id === id) : null;
  const [form, setForm] = useState(() => ({
    name: existing?.name ?? '',
    dose: existing?.dose ?? '1알',
    startDate: existing?.startDate ?? today,
    endDate: existing?.endDate ?? '',
    ongoing: existing ? !existing.endDate : true,
    memo: existing?.memo ?? '',
  }));
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  if (id && !existing) {
    return (
      <main className="screen">
        <SubHeader title="약을 찾을 수 없어요" back="/meds" />
      </main>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('약 이름을 적어 주세요');
    if (!form.dose.trim()) return setError('1회 용량을 적어 주세요');
    if (!form.startDate) return setError('복용 시작일을 골라 주세요');
    if (!form.ongoing && (!form.endDate || form.endDate < form.startDate)) return setError('종료일은 시작일과 같거나 뒤여야 해요');

    const fields = {
      name: form.name.trim(),
      dose: form.dose.trim(),
      startDate: form.startDate,
      endDate: form.ongoing ? null : form.endDate,
      memo: form.memo.trim(),
    };
    if (existing) {
      update((d) => ({ ...d, meds: d.meds.map((m) => (m.id === id ? { ...m, ...fields } : m)) }));
      toast('약 정보를 저장했어요');
      navigate('/meds', { replace: true });
    } else {
      const newId = uid('m');
      update((d) => ({
        ...d,
        meds: [...d.meds, { id: newId, ...fields, times: [8 * 60], days: [0, 1, 2, 3, 4, 5, 6], meal: 'after' }],
      }));
      toast('이제 드실 시간을 정해 주세요');
      navigate(`/meds/${newId}/times`, { replace: true });
    }
  };

  const remove = () => {
    if (!window.confirm(`'${existing.name}'을(를) 지울까요?\n지난 복용 기록도 함께 계산에서 빠져요.`)) return;
    update((d) => ({ ...d, meds: d.meds.filter((m) => m.id !== id) }));
    toast('약을 지웠어요');
    navigate('/meds', { replace: true });
  };

  return (
    <main className="screen">
      <SubHeader title={existing ? '약 정보 수정' : '약 등록'} sub={existing ? null : '1단계 · 약 정보'} back="/meds" />
      <form className="form" onSubmit={submit} noValidate>
        <Field label="약 이름" name="name" placeholder="예: 혈압약" value={form.name} onChange={set('name')} />

        <div className="field">
          <Field label="1회 용량" name="dose" value={form.dose} onChange={set('dose')} />
          <div className="chips">
            {DOSE_CHIPS.map((c) => (
              <button type="button" key={c} className={`chip-opt ${form.dose === c ? 'is-on' : ''}`} onClick={() => setForm({ ...form, dose: c })}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <Field label="복용 시작일" name="startDate" type="date" value={form.startDate} onChange={set('startDate')} />
        <label className="check">
          <input type="checkbox" checked={form.ongoing} onChange={set('ongoing')} />
          <span>끝나는 날 없이 계속 먹어요</span>
        </label>
        {!form.ongoing && (
          <Field label="복용 종료일" name="endDate" type="date" min={form.startDate} value={form.endDate} onChange={set('endDate')} />
        )}

        <div className="field">
          <label htmlFor="f_memo">메모</label>
          <textarea id="f_memo" rows={3} placeholder="예: 물과 함께 드세요" value={form.memo} onChange={set('memo')} />
        </div>

        <ErrorBox message={error} />
        <button type="submit" className="btn-primary">
          {existing ? '저장하기' : '다음 · 복용시간 정하기'}
        </button>
      </form>

      {existing && (
        <div className="menu-group plain" style={{ marginTop: 0 }}>
          <MenuRow
            icon="clock"
            title="복용시간 설정"
            desc={`${existing.times.map(formatTime).join(', ') || '시간 미정'} · ${daysText(existing.days)}`}
            onClick={() => navigate(`/meds/${id}/times`)}
          />
          <button type="button" className="btn-text danger" onClick={remove}>
            이 약 지우기
          </button>
        </div>
      )}
    </main>
  );
}
