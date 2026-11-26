import Icon from './Icon.jsx';
import { navigate } from '../router.js';

const TABS = [
  { id: 'home', path: '/home', label: '홈', icon: 'home' },
  { id: 'meds', path: '/meds', label: '약 관리', icon: 'pill' },
  { id: 'history', path: '/history', label: '복용이력', icon: 'calendar' },
  { id: 'chat', path: '/chat', label: 'AI 상담', icon: 'chat' },
  { id: 'settings', path: '/settings', label: '설정', icon: 'gear' },
];

export default function TabBar({ current }) {
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab ${current === t.id ? 'is-active' : ''}`}
          aria-current={current === t.id ? 'page' : undefined}
          onClick={() => navigate(t.path)}
        >
          <Icon name={t.icon} size={24} strokeWidth={t.id === current ? 2.4 : 2} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}
