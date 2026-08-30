import { Bell, ChevronDown, Command, LogOut, Search, UserRound } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Role, WorkspaceMeta } from '../data';

export function Header({ role, meta, onSearch, onAccountSettings, onNotifications, onSignOut, unread }: { role: Role; meta: WorkspaceMeta; onSearch: (query: string) => void; onAccountSettings: () => void; onNotifications: () => void; onSignOut: () => void; unread: number }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  function submitSearch(event: FormEvent) { event.preventDefault(); onSearch(query); setQuery(''); }
  return <header className="topbar">
    <div className="topbar-context"><span className="topbar-kicker">CLOUD-CAMPUS / ADMIN</span><span className="topbar-divider">/</span><strong>{meta.label}</strong></div>
    <div className="topbar-actions">
      <form className="global-search" onSubmit={submitSearch}><Search size={16} /><input ref={searchRef} aria-label="Search admin workspace" placeholder="Search workspace" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd><Command size={11} />K</kbd></form>
      <button className="icon-button notification-button" aria-label="Open notifications" onClick={onNotifications}><Bell size={17} />{unread > 0 && <span className="notification-dot" />}</button>
      <div className="profile-wrap"><button className="profile-button" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}><span className="avatar avatar-small">{meta.initials}</span><span className="profile-copy"><strong>{meta.person}</strong><small>{meta.short} workspace</small></span><ChevronDown size={14} /></button>{profileOpen && <div className="profile-menu"><div className="profile-menu-head"><span className="avatar">{meta.initials}</span><span><strong>{meta.person}</strong><small>{meta.label}</small></span></div><button onClick={() => { setProfileOpen(false); onAccountSettings(); }}><UserRound size={14} />Account settings</button><button className="profile-signout" onClick={() => { setProfileOpen(false); onSignOut(); }}><LogOut size={14} />Sign out</button></div>}</div>
    </div>
  </header>;
}
