import Icon from './Icon.jsx';

const TABS = [
  { id: 'home', label: '오늘', icon: 'home' },
  { id: 'schedule', label: '시간 설정', icon: 'clock' },
  { id: 'history', label: '기록', icon: 'calendar' },
];

export default function TabBar({ current, onNavigate }) {
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab ${current === t.id ? 'is-active' : ''}`}
          aria-current={current === t.id ? 'page' : undefined}
          onClick={() => onNavigate(t.id)}
        >
          <Icon name={t.icon} size={28} strokeWidth={2.2} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}
