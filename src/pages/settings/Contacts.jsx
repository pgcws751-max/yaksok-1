import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { dialog } from '../../components/Dialog.jsx';
import { ErrorBox, Field, SubHeader } from '../../components/ui.jsx';
import { RELATIONS, addContact, listContacts, phoneText, removeContact } from '../../lib/contacts.js';

export default function Contacts({ ctx }) {
  const { user, toast } = ctx;
  const [list, setList] = useState(() => listContacts(user.id));
  const [form, setForm] = useState({ name: '', relation: '딸', phone: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    try {
      setList(addContact(user.id, form));
      setForm({ name: '', relation: '딸', phone: '' });
      setAdding(false);
      setError('');
      toast('연락처를 추가했어요');
    } catch (err) {
      setError(err.userMessage || '추가하지 못했어요');
    }
  };

  const remove = async (c) => {
    if (await dialog.confirm({ title: `${c.name}님 연락처를 지울까요?`, confirmText: '지우기', danger: true })) {
      setList(removeContact(user.id, c.id));
      toast('연락처를 지웠어요');
    }
  };

  return (
    <main className="screen">
      <SubHeader title="가족·지인 연락처" sub="도우미에게 '딸에게 전화해줘'처럼 말할 수 있어요" back="/settings" />

      {list.length > 0 && (
        <ul className="contact-list">
          {list.map((c) => (
            <li key={c.id} className="card contact-row">
              <span className="contact-ic" aria-hidden="true">
                {c.name.slice(0, 1)}
              </span>
              <span className="contact-txt">
                <b>
                  {c.name} <em>{c.relation}</em>
                </b>
                <span>{phoneText(c.phone)}</span>
              </span>
              <a className="round call" href={`tel:${c.phone}`} aria-label={`${c.name}에게 전화 걸기`}>
                <Icon name="phone" size={20} strokeWidth={2.2} />
              </a>
              <button type="button" className="undo" aria-label={`${c.name} 연락처 지우기`} onClick={() => remove(c)}>
                <Icon name="close" size={14} strokeWidth={3} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!list.length && !adding && <p className="empty">아직 등록한 연락처가 없어요.<br />자주 연락하는 가족이나 보호자를 넣어 두세요.</p>}

      {adding ? (
        <form className="form card contact-form" onSubmit={submit} noValidate>
          <Field label="이름" name="name" placeholder="예: 김영희" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="field">
            <label>관계</label>
            <div className="chips">
              {RELATIONS.map((r) => (
                <button key={r} type="button" className={`chip-opt ${form.relation === r ? 'is-on' : ''}`} aria-pressed={form.relation === r} onClick={() => setForm({ ...form, relation: r })}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Field label="전화번호" name="phone" type="tel" inputMode="numeric" placeholder="010-0000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <ErrorBox message={error} />
          <div className="push-actions">
            <button type="button" className="btn-soft" onClick={() => setAdding(false)}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              추가하기
            </button>
          </div>
        </form>
      ) : (
        <div className="pad" style={{ marginTop: 12 }}>
          <button type="button" className="btn-primary with-icon" onClick={() => setAdding(true)}>
            <Icon name="plus" size={20} />
            연락처 추가
          </button>
        </div>
      )}

      <p className="field-hint" style={{ margin: '14px 20px 28px' }}>연락처는 이 기기에만 저장돼요.</p>
    </main>
  );
}
