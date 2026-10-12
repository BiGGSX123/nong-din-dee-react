import { NAV_TABS } from '../data/nav';

export default function NavBar({ screen, onNavigate, tabs = NAV_TABS }) {
  return (
    <div className="navbar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={screen === t.id ? 'active' : ''}
          style={{ '--accent': t.accent }}
          onClick={() => onNavigate(t.id)}
          type="button"
        >
          <span className="nav-icon-wrap"><span className="nav-icon">{t.icon}</span></span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
