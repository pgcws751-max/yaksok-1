import Icon from './Icon.jsx';
import { goBack } from '../router.js';

// 뒤로 버튼 + 제목이 있는 화면 머리
export function SubHeader({ title, sub, back = '/home' }) {
  return (
    <header style={{ padding: '16px 20px 0' }}>
      <button type="button" className="back" onClick={() => goBack(back)}>
        <Icon name="back" size={20} strokeWidth={2.6} />
        뒤로
      </button>
      <h1 className="title" style={{ marginTop: 4 }}>
        {title}
      </h1>
      {sub && <div className="sub">{sub}</div>}
    </header>
  );
}

export function Field({ label, hint, error, ...props }) {
  const id = props.id || `f_${props.name}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} aria-invalid={error ? 'true' : undefined} />
      {hint && !error && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <p className="error-box" role="alert">
      {message}
    </p>
  );
}

export function Toggle({ on, onChange, labelOn = '켜짐', labelOff = '꺼짐', label }) {
  return (
    <button type="button" className="toggle" aria-pressed={on} aria-label={label} onClick={() => onChange(!on)}>
      {on ? labelOn : labelOff}
      <span className="track">
        <span className="knob" />
      </span>
    </button>
  );
}

export function MenuRow({ icon, title, desc, onClick, danger }) {
  return (
    <button type="button" className={`menu-row ${danger ? 'danger' : ''}`} onClick={onClick}>
      {icon && (
        <span className="ic">
          <Icon name={icon} size={20} strokeWidth={2.3} />
        </span>
      )}
      <span className="txt">
        <b>{title}</b>
        {desc && <span>{desc}</span>}
      </span>
      <Icon name="chevron" size={20} strokeWidth={2.6} style={{ marginLeft: 'auto', flex: 'none' }} />
    </button>
  );
}
