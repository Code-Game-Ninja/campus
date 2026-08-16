import { HelpCircle, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { navByRole, type Role, type WorkspaceMeta } from '../data';

export function Sidebar({ role, meta, active, onNavigate, onSignOut }: { role: Role; meta: WorkspaceMeta; active: string; onNavigate: (label: string) => void; onSignOut: () => void }) {
  return <aside className="sidebar">
    <Logo />
    <div className="scope-card">
      <span className="eyebrow">Active scope</span>
      <strong>{meta.scope}</strong>
      <span className="scope-status"><span className="pulse-dot" />Live database</span>
    </div>
    <nav className="nav-list" aria-label="Administration sections">
      <span className="nav-section-label">Workspace</span>
      {navByRole[role].map((item) => {
        const Icon = item.icon;
        return <button key={item.label} className={`nav-item ${active === item.label ? 'active' : ''}`} onClick={() => onNavigate(item.label)}>
          <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}
        </button>;
      })}
    </nav>
    <div className="sidebar-bottom">
      <button className="sidebar-link" onClick={() => onNavigate('Help')}><HelpCircle size={16} />Help centre</button>
      <button className="account-mini" onClick={onSignOut} aria-label="Sign out of admin workspace" title="Sign out"><span className="avatar">{meta.initials}</span><span><strong>{meta.person}</strong><small>{meta.label}</small></span><LogOut size={14} /></button>
    </div>
  </aside>;
}
