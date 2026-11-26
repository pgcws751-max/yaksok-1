import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// 앱 디자인에 맞춘 확인창 · 알림창
//   const ok = await dialog.confirm({ title, message, confirmText, danger });
//   await dialog.alert({ title, message });
// 화면 어디서나 부를 수 있고, App 에 <DialogHost /> 하나만 두면 됩니다.
// ─────────────────────────────────────────────────────────────

let push = null; // DialogHost 가 연결되면 채워집니다
const pending = [];

function open(opts) {
  return new Promise((resolve) => {
    const item = { ...opts, resolve };
    if (push) push(item);
    else pending.push(item);
  });
}

export const dialog = {
  confirm: ({ title, message, confirmText = '확인', cancelText = '취소', danger = false } = {}) =>
    open({ kind: 'confirm', title, message, confirmText, cancelText, danger }),
  alert: ({ title, message, confirmText = '확인' } = {}) =>
    open({ kind: 'alert', title, message, confirmText }).then(() => undefined),
};

export function DialogHost() {
  const [queue, setQueue] = useState([]);
  const current = queue[0];
  const okRef = useRef(null);
  const cancelRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    push = (item) => setQueue((q) => [...q, item]);
    if (pending.length) setQueue((q) => [...q, ...pending.splice(0)]);
    return () => {
      push = null;
    };
  }, []);

  const close = (value) => {
    current.resolve(value);
    setQueue((q) => q.slice(1));
  };

  // 열릴 때 버튼에 초점, 닫히면 원래 자리로
  useEffect(() => {
    if (!current) return undefined;
    lastFocus.current = document.activeElement;
    const target = current.danger ? cancelRef.current : okRef.current;
    (target || okRef.current)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      }
      if (e.key === 'Tab') {
        const items = [cancelRef.current, okRef.current].filter(Boolean);
        const i = items.indexOf(document.activeElement);
        e.preventDefault();
        items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus.current?.focus?.();
    };
  }, [current]);

  if (!current) return null;
  const isConfirm = current.kind === 'confirm';

  return (
    <div className="dlg-backdrop" onClick={() => close(false)}>
      <div
        className="dlg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={current.title ? 'dlg-title' : undefined}
        aria-describedby={current.message ? 'dlg-msg' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {current.title && (
          <h2 id="dlg-title" className="dlg-title">
            {current.title}
          </h2>
        )}
        {current.message && (
          <p id="dlg-msg" className="dlg-msg">
            {current.message}
          </p>
        )}
        <div className={`dlg-actions ${isConfirm ? '' : 'single'}`}>
          {isConfirm && (
            <button ref={cancelRef} type="button" className="dlg-btn cancel" onClick={() => close(false)}>
              {current.cancelText}
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            className={`dlg-btn ok ${current.danger ? 'danger' : ''}`}
            onClick={() => close(true)}
          >
            {current.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
