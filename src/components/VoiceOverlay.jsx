import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { canRecognize, listen } from '../lib/voice.js';

// 화면 전체 "듣고 있어요" 창. 다 들으면 onDone(문장), 닫으면 onCancel()
export default function VoiceOverlay({ onDone, onCancel, samples, hint = '예: "딸에게 전화해줘"', title }) {
  const [heard, setHeard] = useState('');
  const [phase, setPhase] = useState('listening'); // listening | done | error | denied
  const [round, setRound] = useState(0);
  const real = canRecognize();

  useEffect(() => {
    const ac = new AbortController();
    setHeard('');
    setPhase('listening');
    listen({ onText: setHeard, signal: ac.signal, samples }).then((r) => {
      if (ac.signal.aborted || r == null) return;
      if (typeof r === 'object') {
        setPhase(r.error === 'denied' ? 'denied' : 'error');
        return;
      }
      setHeard(r);
      setPhase('done');
      setTimeout(() => !ac.signal.aborted && onDone(r), 600);
    });
    const onKey = (e) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => {
      ac.abort();
      document.removeEventListener('keydown', onKey);
    };
  }, [round]);

  const state = {
    listening: heard ? '듣고 있어요…' : title || '말씀해 주세요',
    done: '이렇게 들었어요',
    error: '잘 못 들었어요. 다시 말씀해 주세요',
    denied: '마이크 사용이 막혀 있어요. 브라우저 설정에서 마이크를 허용해 주세요',
  }[phase];

  return (
    <div className="voice" role="dialog" aria-modal="true" aria-label="음성으로 말하기">
      <span className={`badge ${real ? 'on' : 'wait'} voice-badge`}>{real ? '음성 인식 켜짐' : '샘플 · 음성 인식 연결 전'}</span>
      <p className="voice-state">{state}</p>
      <p className="voice-text" aria-live="polite">{heard || hint}</p>
      <div className={`voice-mic ${phase === 'listening' ? '' : 'done'}`}>
        <span className="ring r1" />
        <span className="ring r2" />
        <span className="core">
          <Icon name="mic" size={40} color="#fff" strokeWidth={2.2} />
        </span>
      </div>
      {phase === 'listening' ? (
        <div className="voice-bars" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${(i % 5) * 0.12}s` }} />
          ))}
        </div>
      ) : (
        <div style={{ height: 36 }} />
      )}
      <div className="voice-actions">
        {(phase === 'error' || phase === 'denied') && (
          <button type="button" className="btn-primary voice-cancel" onClick={() => setRound((n) => n + 1)}>
            다시 말하기
          </button>
        )}
        <button type="button" className="btn-soft voice-cancel" onClick={onCancel}>
          그만하기
        </button>
      </div>
    </div>
  );
}
