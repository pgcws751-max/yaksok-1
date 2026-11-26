import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import TabBar from '../components/TabBar.jsx';
import { dialog } from '../components/Dialog.jsx';
import { GREETING, SERVICES, SUGGESTIONS, getReply } from '../lib/chatbot.js';
import { phoneText } from '../lib/contacts.js';
import { load, save } from '../lib/storage.js';
import { navigate } from '../router.js';

const KEY = 'yaksok:chat2';

function BotAvatar() {
  return (
    <span className="chat-avatar" aria-hidden="true">
      <Icon name="chat" size={18} color="#fff" strokeWidth={2.2} />
    </span>
  );
}

async function call119() {
  const ok = await dialog.confirm({ title: '119에 전화할까요?', message: '긴급 상황일 때만 걸어 주세요.', confirmText: '119 전화', danger: true });
  if (ok) window.location.href = 'tel:119';
}

function Card({ card, send, disabled }) {
  if (card.type === 'services') {
    return (
      <div className="svc-grid">
        {SERVICES.map((s) => (
          <button key={s.label} type="button" className={`svc ${s.icon === 'siren' ? 'danger' : ''}`} disabled={disabled} onClick={() => send(s.ask)}>
            <span className="svc-ic">
              <Icon name={s.icon} size={22} strokeWidth={2.1} />
            </span>
            {s.label}
          </button>
        ))}
      </div>
    );
  }
  if (card.type === 'today') {
    return (
      <div className="chat-card">
        <b>오늘 일정</b>
        {card.slots.map((s) => (
          <div key={s.minutes} className="chat-card-row">
            <span className={`mini-dot ${s.taken ? 'done' : ''}`} aria-hidden="true">
              {s.taken && <Icon name="check" size={12} strokeWidth={3.5} />}
            </span>
            <span>
              <b>{s.label}</b> {s.time}
              <small>{s.items.map((i) => `${i.name} ${i.dose}`).join(' · ')}</small>
            </span>
            <em className={s.taken ? 'good' : ''}>{s.taken ? '완료' : '예정'}</em>
          </div>
        ))}
      </div>
    );
  }
  if (card.type === 'rate') {
    return (
      <div className="chat-card rate">
        <div>
          <small>이번 주 복용률</small>
          <b className="good">{card.percent == null ? '-' : `${card.percent}%`}</b>
          <small>
            {card.taken}/{card.due}번
          </small>
        </div>
        <div>
          <small>연속 복용</small>
          <b>{card.streak}일</b>
        </div>
      </div>
    );
  }
  if (card.type === 'places') {
    return (
      <div className="chat-card">
        <b>
          {card.title} <span className="badge wait">샘플</span>
        </b>
        {card.items.map((p) => (
          <div key={p.name} className="place-row">
            <span className={`place-ic ${card.kind}`} aria-hidden="true">
              <Icon name={card.kind === 'pharmacy' ? 'pharmacy' : 'hospital'} size={18} strokeWidth={2.2} />
            </span>
            <span className="place-txt">
              <b>{p.name}</b>
              <small>
                {p.dist} · {p.open}
              </small>
            </span>
          </div>
        ))}
        <a className="btn-map" href={card.map} target="_blank" rel="noopener noreferrer">
          <Icon name="pin" size={18} strokeWidth={2.2} />
          {card.mapLabel}
        </a>
        <small className="muted">목록은 예시예요. 지도 버튼은 실제 카카오맵 검색이 열려요.</small>
      </div>
    );
  }
  if (card.type === 'contact') {
    const p = card.contact;
    return (
      <div className="chat-card">
        <div className="contact-row flat">
          <span className="contact-ic" aria-hidden="true">
            {p.name.slice(0, 1)}
          </span>
          <span className="contact-txt">
            <b>
              {p.name} <em>{p.relation}</em>
            </b>
            <span>{phoneText(p.phone)}</span>
          </span>
        </div>
        <div className="call-actions">
          <a className="btn-call" href={`tel:${p.phone}`}>
            <Icon name="phone" size={20} strokeWidth={2.2} />
            전화 걸기
          </a>
          <a className="btn-sms" href={`sms:${p.phone}`}>
            <Icon name="chat" size={18} strokeWidth={2.2} />
            문자
          </a>
        </div>
      </div>
    );
  }
  if (card.type === 'contacts') {
    return (
      <div className="chat-card">
        <b>가족·지인</b>
        {card.list.map((p) => (
          <div key={p.id} className="contact-row flat">
            <span className="contact-ic" aria-hidden="true">
              {p.name.slice(0, 1)}
            </span>
            <span className="contact-txt">
              <b>
                {p.name} <em>{p.relation}</em>
              </b>
              <span>{phoneText(p.phone)}</span>
            </span>
            <a className="round call" href={`tel:${p.phone}`} aria-label={`${p.name}에게 전화 걸기`}>
              <Icon name="phone" size={18} strokeWidth={2.2} />
            </a>
          </div>
        ))}
      </div>
    );
  }
  if (card.type === 'emergency') {
    return (
      <div className="chat-card">
        <button type="button" className="btn-119" onClick={call119}>
          <Icon name="siren" size={22} strokeWidth={2.2} />
          119 전화하기
        </button>
        <a className="btn-map" href={card.map} target="_blank" rel="noopener noreferrer">
          <Icon name="pin" size={18} strokeWidth={2.2} />
          가까운 응급실 지도
        </a>
      </div>
    );
  }
  return null;
}

export default function Chat({ ctx }) {
  const [messages, setMessages] = useState(() => load(KEY, null, 'session') || [GREETING]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    save(KEY, messages.slice(-60), 'session');
    endRef.current?.scrollIntoView({ block: 'end', behavior: messages.length > 1 ? 'smooth' : 'auto' });
  }, [messages, typing]);

  const send = async (raw) => {
    const q = raw.trim();
    if (!q || typing) return;
    setText('');
    setMessages((m) => [...m, { role: 'me', text: q }]);
    setTyping(true);
    try {
      const r = await getReply(q, ctx);
      setMessages((m) => [...m, { role: 'bot', ...r }]);
    } finally {
      setTyping(false);
    }
  };

  const clear = async () => {
    if (await dialog.confirm({ title: '대화를 지울까요?', message: '이 기기에서 나눈 대화가 지워져요.', confirmText: '지우기', danger: true })) {
      setMessages([GREETING]);
    }
  };

  return (
    <main className="screen chat">
      <header className="chat-top">
        <div className="chat-title">
          <BotAvatar />
          <div>
            <h1>도우미</h1>
            <span>약속 생활 도우미</span>
          </div>
        </div>
        <span className="badge wait">샘플 화면</span>
        <button type="button" className="icon-btn danger-ic" aria-label="119 긴급 전화" onClick={call119}>
          <Icon name="siren" size={20} strokeWidth={2.2} />
        </button>
        <button type="button" className="icon-btn" aria-label="대화 지우기" onClick={clear}>
          <Icon name="close" size={20} strokeWidth={2.2} />
        </button>
      </header>
      <p className="chat-note">미리 정해 둔 답변을 보여 주는 샘플이에요. 전화·지도 버튼은 실제로 동작해요. 의학적 판단은 의사·약사와 상담하세요.</p>

      <div className="chat-list" role="log" aria-live="polite" aria-label="대화 내용">
        {messages.map((m, i) =>
          m.role === 'me' ? (
            <div key={i} className="msg me">
              <p className="bubble">{m.text}</p>
            </div>
          ) : (
            <div key={i} className="msg bot">
              <BotAvatar />
              <div className="msg-body">
                <p className={`bubble ${m.tone || ''}`}>{m.text}</p>
                {m.card && <Card card={m.card} send={send} disabled={typing} />}
                {m.action && (
                  <button type="button" className="chat-action" onClick={() => (m.action.ask ? send(m.action.ask) : navigate(m.action.path))}>
                    {m.action.label}
                    <Icon name="chevron" size={16} strokeWidth={2.6} />
                  </button>
                )}
              </div>
            </div>
          ),
        )}
        {typing && (
          <div className="msg bot">
            <BotAvatar />
            <p className="bubble typing" aria-label="답변을 쓰는 중">
              <i />
              <i />
              <i />
            </p>
          </div>
        )}
        <div ref={endRef} className="chat-end" />
      </div>

      <div className="chat-foot">
        <div className="chat-chips" role="group" aria-label="자주 묻는 질문">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip-opt" disabled={typing} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
            inputRef.current?.focus();
          }}
        >
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 딸에게 전화해줘, 가까운 약국" aria-label="메시지" maxLength={300} />
          <button type="submit" className="chat-send" aria-label="보내기" disabled={!text.trim() || typing}>
            <Icon name="send" size={20} strokeWidth={2.4} />
          </button>
        </form>
      </div>

      <TabBar current="chat" />
    </main>
  );
}
