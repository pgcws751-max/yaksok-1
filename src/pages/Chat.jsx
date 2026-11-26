import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import TabBar from '../components/TabBar.jsx';
import { dialog } from '../components/Dialog.jsx';
import { GREETING, SUGGESTIONS, getReply } from '../lib/chatbot.js';
import { load, save } from '../lib/storage.js';
import { navigate } from '../router.js';

const KEY = 'yaksok:chat';

function BotAvatar() {
  return (
    <span className="chat-avatar" aria-hidden="true">
      <Icon name="chat" size={18} color="#fff" strokeWidth={2.2} />
    </span>
  );
}

function Card({ card }) {
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
            <h1>AI 상담</h1>
            <span>약속 AI 도우미</span>
          </div>
        </div>
        <span className="badge wait">샘플 화면</span>
        <button type="button" className="icon-btn" aria-label="대화 지우기" onClick={clear}>
          <Icon name="close" size={20} strokeWidth={2.2} />
        </button>
      </header>
      <p className="chat-note">지금은 미리 정해 둔 답변을 보여 주는 샘플이에요. 의학적 판단은 의사·약사와 상담하세요.</p>

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
                {m.card && <Card card={m.card} />}
                {m.action && (
                  <button type="button" className="chat-action" onClick={() => navigate(m.action.path)}>
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
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="궁금한 점을 적어 주세요" aria-label="메시지" maxLength={300} />
          <button type="submit" className="chat-send" aria-label="보내기" disabled={!text.trim() || typing}>
            <Icon name="send" size={20} strokeWidth={2.4} />
          </button>
        </form>
      </div>

      <TabBar current="chat" />
    </main>
  );
}
