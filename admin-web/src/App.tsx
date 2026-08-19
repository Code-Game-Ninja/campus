import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, Download, Plus, X } from 'lucide-react';
import { ActivityPanel, CampusMap, ProgressPanel, QuickActions, TrendChart } from './components/Charts';
import { AccountSettingsView } from './components/AccountSettingsView';
import { AuthView } from './components/AuthView';
import { DataTable } from './components/DataTable';
import { Header } from './components/Header';
import { HealthView } from './components/HealthView';
import { HelpView } from './components/HelpView';
import { MetricCard } from './components/MetricCard';
import { Modal } from './components/Modal';
import { Notifications } from './components/Notifications';
import { NotificationCenter } from './components/NotificationCenter';
import { ScopeBar } from './components/ScopeBar';
import { Sidebar } from './components/Sidebar';
import { SettingsView, type WorkspaceSettings } from './components/SettingsView';
import { StateView, type ViewState } from './components/StateView';
import { Toast } from './components/Toast';
import { navByRole, roleMeta, type Role, type WorkspaceMeta } from './data';
import { apiDelete, apiGet, apiPatch, apiPost, hasSession, signOut, tableEndpoint, type AdminContext, type DashboardData, type NotificationRecord, type TableData } from './lib/api';

type ModalKind = 'event' | 'manager' | 'campus' | 'post' | null;
type RowActionRequest = { section: string; record: Record<string, unknown> } | null;
type HealthData = { status: string; latencyMs: number; checkedAt: string; services: Array<{ name: string; status: string }> };
type CampusOption = { id: string; name: string; status: string };

const pageCopy: Record<string, { title: string; description: string }> = {
  Overview: { title: 'Overview', description: 'Live operating data for your active permission scope.' },
  Events: { title: 'Events', description: 'Manage lifecycle, capacity, venues, and attendee-facing details.' },
  Registrations: { title: 'Registrations', description: 'Review attendee registrations and waitlist pressure.' },
  'Venues & Media': { title: 'Venues & media', description: 'Review event locations, media, and schedules.' },
  Posts: { title: 'Campus posts', description: 'Create and manage content in your campus scope.' },
  'All Content': { title: 'All content', description: 'Search platform content across the global operational scope.' },
  Moderation: { title: 'Moderation queue', description: 'Resolve reports with reason, scope, and audit context.' },
  Users: { title: 'App users', description: 'Review account status, verified contact details, device bindings, and reports within your permission scope.' },
  'Campus Change Requests': { title: 'Campus change requests', description: 'Review and decide campus changes through the protected admin API.' },
  Notifications: { title: 'Notifications', description: 'Review persistent operational and workflow updates.' },
  'Event Managers': { title: 'Event managers', description: 'Invite and manage event assignments for this campus.' },
  'Staff & Roles': { title: 'Staff and roles', description: 'Manage scoped assignments with an explicit policy boundary.' },
  Campuses: { title: 'Campus directory', description: 'Manage platform campuses and their lifecycle status.' },
  'Audit Log': { title: 'Audit log', description: 'Append-only evidence for sensitive operational actions.' },
  'Platform Health': { title: 'Platform health', description: 'Live reachability checks for core services.' },
  'Campus Settings': { title: 'Campus settings', description: 'Configure operational preferences for the assigned campus.' },
  'Platform Settings': { title: 'Platform settings', description: 'Configure global operational preferences.' },
  'Account Settings': { title: 'Account settings', description: 'Review the authenticated identity and permission assignment.' },
  Help: { title: 'Help centre', description: 'Guidance for the connected administration workspace.' },
};

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AD'; }

export function App() {
  const [context, setContext] = useState<AdminContext | null>(null);
  const [booting, setBooting] = useState(true);
  const [section, setSection] = useState('Overview');
  const [tableFilter, setTableFilter] = useState('all');
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [toast, setToast] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [rowActionRequest, setRowActionRequest] = useState<RowActionRequest>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);

  const role: Role = context?.role || 'campus_admin';
  const baseMeta = roleMeta[role];
  const meta: WorkspaceMeta = context ? { ...baseMeta, person: context.user.displayName, initials: initials(context.user.displayName), scope: context.campus?.name || 'All campuses', email: context.user.email } : baseMeta;
  const copy = pageCopy[section] || pageCopy.Overview;
  const heading = section === 'Overview' ? { title: `Good morning, ${meta.person.split(' ')[0]}.`, description: copy.description } : copy;
  const isListSection = Boolean(tableEndpoint(section));
  const unread = notifications.filter((item) => item.unread).length;

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 4200); }
  async function loadMe() { const next = await apiGet<AdminContext>('/v1/me'); setContext(next); return next; }
  async function loadNotifications() { const result = await apiGet<{ records: NotificationRecord[] }>('/v1/notifications?limit=100'); setNotifications(result.records); }
  async function loadDashboard() { setDashboard(await apiGet<DashboardData>('/v1/dashboard')); }
  async function loadCampusOptions() {
    if (role !== 'super_admin') return;
    const result = await apiGet<TableData>('/v1/campuses?limit=100');
    setCampusOptions(result.records.filter((row) => row.status === 'active').map((row) => ({ id: String(row.id), name: String(row.name), status: String(row.status) })));
  }

  async function refreshSection(target = section, filter = tableFilter) {
    if (!context) return false;
    setViewState('loading'); setTable(null);
    try {
      if (target === 'Overview') await loadDashboard();
      else if (target === 'Notifications') await loadNotifications();
      else if (target === 'Platform Health') setHealth(await apiGet<HealthData>('/v1/health'));
      else if (target === 'Campus Settings' || target === 'Platform Settings') setSettings(await apiGet<WorkspaceSettings>('/v1/settings'));
      else {
        const endpoint = tableEndpoint(target);
        if (endpoint) {
          const params = new URLSearchParams({ limit: '100' });
          params.set('status', filter);
          const result = await apiGet<TableData>(`${endpoint}?${params.toString()}`);
          setTable(result);
          if (!result.rows.length && filter === 'all') { setViewState('empty'); return true; }
        }
      }
      setViewState('ready');
      return true;
    } catch (error) {
      setViewState(error instanceof Error && 'status' in error && (error as { status: number }).status === 403 ? 'permission-denied' : 'error');
      notify(error instanceof Error ? error.message : 'The workspace could not load.');
      return false;
    }
  }

  useEffect(() => {
    async function boot() {
      if (!hasSession()) { setBooting(false); return; }
      try { await loadMe(); } catch { await signOut(); setContext(null); }
      finally { setBooting(false); }
    }
    void boot();
  }, []);

  useEffect(() => {
    if (!context) return;
    void Promise.all([refreshSection(section), loadNotifications()]);
  }, [context?.user.id, section]);

  useEffect(() => {
    if (role === 'super_admin') void loadCampusOptions().catch((error) => notify(error instanceof Error ? error.message : 'Campus list could not load.'));
    else setCampusOptions([]);
  }, [role]);

  function navigate(next: string) { setTableFilter('all'); setSection(next); requestAnimationFrame(() => document.querySelector<HTMLElement>('.workspace')?.scrollTo({ top: 0, behavior: 'smooth' })); }
  async function applyTableFilter(value: string) {
    setTableFilter(value);
    if (await refreshSection(section, value)) notify(value === 'all' ? 'Status filter cleared.' : `Showing ${value} records from the live API.`);
  }
  async function searchWorkspace(query: string) {
    const normalized = query.trim().toLowerCase();
    const target = [...navByRole[role].map((item) => item.label), 'Account Settings', 'Help'].find((label) => label.toLowerCase().includes(normalized));
    if (target) { navigate(target); notify(`Opened ${target}.`); return; }
    try {
      const result = await apiGet<{ results: Array<{ section: string; type: string; label: string }> }>(`/v1/search?q=${encodeURIComponent(query.trim())}`);
      const first = result.results[0];
      if (first) { navigate(first.section); notify(`${first.type}: ${first.label}`); }
      else notify(`No live records match "${query.trim()}".`);
    } catch (error) { notify(error instanceof Error ? error.message : 'Search failed.'); }
  }
  async function logout() { await signOut(); setContext(null); setNotificationsOpen(false); setSection('Overview'); }

  async function readNotification(id: string) { await apiPost(`/v1/notifications/${id}/read`); await loadNotifications(); }
  async function readAllNotifications() { await apiPost('/v1/notifications/read-all'); await loadNotifications(); }
  async function saveWorkspaceSettings(next: WorkspaceSettings) { await apiPatch('/v1/settings', { displayName: next.display_name, supportEmail: next.support_email, adminNotice: next.admin_notice, digestEnabled: next.digest_enabled, moderationAlerts: next.moderation_alerts }); setSettings(next); }

  async function submitWorkflow(kind: Exclude<ModalKind, null>, values: Record<string, string>) {
    if (kind === 'event') await apiPost('/v1/events', { title: values.title, description: values.description, summary: values.description, startsAt: new Date(values.startsAt).toISOString(), endsAt: new Date(values.endsAt).toISOString(), venueName: values.venueName, capacity: values.capacity, campusId: values.campusId || context?.campusId });
    if (kind === 'manager') await apiPost('/v1/staff/invite', { email: values.email, role: values.role || 'event_manager', campusId: values.campusId || context?.campusId });
    if (kind === 'campus') await apiPost('/v1/campuses', { name: values.name, slug: values.slug, countryCode: values.countryCode || 'IN' });
    if (kind === 'post') await apiPost('/v1/posts', { body: values.body, visibility: values.visibility || 'campus', campusId: values.campusId || context?.campusId });
    setModal(null); notify(`${kind[0].toUpperCase()}${kind.slice(1)} workflow completed.`); await Promise.all([refreshSection(section), loadDashboard()]);
  }

  function rowAction(index: number) {
    const record = table?.records[index] as Record<string, string> | undefined;
    if (!record?.id) return;
    if (section === 'Campus Change Requests' && !['pending', 'processing'].includes(String(record.status))) { notify('This request already has a final decision.'); return; }
    if (!['Posts', 'All Content', 'Moderation', 'Events', 'Venues & Media', 'Event Managers', 'Staff & Roles', 'Campuses', 'Users', 'Campus Change Requests'].includes(section)) { notify('This record is read-only.'); return; }
    if (section === 'Users') {
      void apiGet<any>(`/v1/users/${record.id}`).then((security) => setRowActionRequest({ section, record: { ...record, security } })).catch((error) => notify(error instanceof Error ? error.message : 'User details could not load.'));
      return;
    }
    setRowActionRequest({ section, record });
  }

  async function submitRowAction(values: Record<string, string>) {
    if (!rowActionRequest) return;
    const { section: targetSection, record } = rowActionRequest;
    try {
      if (targetSection === 'Posts' || targetSection === 'All Content') await apiPatch(`/v1/posts/${record.id}/status`, { status: values.status });
      else if (targetSection === 'Moderation') await apiPatch(`/v1/moderation/${record.id}`, { action: values.action, reason: values.reason || values.action });
      else if (targetSection === 'Events' || targetSection === 'Venues & Media') await apiPatch(`/v1/events/${record.id}/status`, { status: values.status });
      else if (targetSection === 'Event Managers' || targetSection === 'Staff & Roles') await apiDelete(`/v1/staff/${record.id}`);
      else if (targetSection === 'Campuses') {
        if (values.action === 'delete') await apiDelete(`/v1/campuses/${record.id}`);
        else if (values.action === 'edit') await apiPatch(`/v1/campuses/${record.id}`, { name: values.name, slug: values.slug, countryCode: values.countryCode, timezone: values.timezone });
        else await apiPatch(`/v1/campuses/${record.id}/status`, { status: values.status });
      } else if (targetSection === 'Users') {
        if (values.action === 'revoke_sessions') await apiPost(`/v1/users/${record.id}/sessions`, {});
        else await apiPatch(`/v1/users/${record.id}`, { action: values.action, reason: values.reason, deviceId: values.deviceId || null });
      } else if (targetSection === 'Campus Change Requests') await apiPatch(`/v1/account-requests/${record.id}`, { decision: values.decision, reason: values.reason });
      setRowActionRequest(null);
      notify('Change saved and recorded in the audit log.');
      await Promise.all([refreshSection(targetSection), loadDashboard(), targetSection === 'Campuses' ? loadCampusOptions() : Promise.resolve()]);
    } catch (error) { notify(error instanceof Error ? error.message : 'The action could not be completed.'); }
  }

  function exportTable() {
    if (!table?.rows.length) { notify('There is no loaded table data to export.'); return; }
    const csv = [table.columns, ...table.rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = `${section.toLowerCase().replace(/\s+/g, '-')}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const primary = useMemo(() => {
    if (section === 'Events' && ['event_manager', 'campus_admin'].includes(role)) return { label: 'New event', kind: 'event' as const };
    if (section === 'Posts' && ['campus_admin', 'super_admin'].includes(role)) return { label: 'New post', kind: 'post' as const };
    if ((section === 'Event Managers' || section === 'Staff & Roles') && ['campus_admin', 'super_admin'].includes(role)) return { label: 'Invite staff', kind: 'manager' as const };
    if (section === 'Campuses' && role === 'super_admin') return { label: 'Add campus', kind: 'campus' as const };
    return null;
  }, [role, section]);

  if (booting) return <main className="auth-shell"><div className="state-layout"><div className="skeleton hero-skeleton" /></div></main>;
  if (!context) return <AuthView onAuthenticated={async () => { await loadMe(); setBooting(false); }} />;

  function mainContent() {
    if (viewState !== 'ready') return <StateView state={viewState} onReset={() => void refreshSection(section)} />;
    if (section === 'Overview') return <Overview role={role} dashboard={dashboard} onNavigate={navigate} onAction={notify} />;
    if (section === 'Notifications') return <NotificationCenter items={notifications} onRead={readNotification} onReadAll={readAllNotifications} onAction={notify} />;
    if (section === 'Platform Health') return <HealthView role={role} data={health} onRefresh={async () => setHealth(await apiGet<HealthData>('/v1/health'))} onAction={notify} />;
    if (section === 'Help') return <HelpView />;
    if (section === 'Account Settings') return <AccountSettingsView role={role} meta={meta} onRefresh={async () => { await loadMe(); notify('Identity and permission scope refreshed from the live API.'); }} />;
    if (section === 'Campus Settings' || section === 'Platform Settings') return <SettingsView scope={meta.scope} settings={settings} onSave={saveWorkspaceSettings} onAction={notify} />;
    if (table) return <DataTable title={copy.title} description={copy.description} scope={meta.scope} columns={table.columns} rows={table.rows} primaryAction={primary?.label} onPrimary={primary ? () => setModal(primary.kind) : undefined} onRowAction={rowAction} onAction={notify} filterValue={tableFilter} onFilterChange={applyTableFilter} />;
    return <StateView state="empty" onReset={() => void refreshSection(section)} />;
  }

  return <div className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <Sidebar role={role} meta={meta} active={section} onNavigate={navigate} onSignOut={() => void logout()} />
    <main className="main-content"><Header role={role} meta={meta} onSearch={searchWorkspace} onAccountSettings={() => navigate('Account Settings')} onNotifications={() => setNotificationsOpen(true)} onSignOut={() => void logout()} unread={unread} />
      <div className={`workspace ${section === 'Overview' ? 'workspace-overview' : ''} ${isListSection ? 'workspace-list' : ''}`}>
        {section !== 'Overview' && <div className="breadcrumb"><button onClick={() => navigate('Overview')}>Overview</button><span>/</span><strong>{section}</strong></div>}
        <ScopeBar role={role} meta={meta} onNavigate={navigate} />
        <div className="page-heading"><div><span className="eyebrow">{meta.scope}</span><h1>{heading.title}</h1><p>{heading.description}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={exportTable}><Download size={14} />Export</button>{section === 'Overview' && <button className="button button-primary" onClick={() => setModal(role === 'event_manager' ? 'event' : role === 'super_admin' ? 'campus' : 'manager')}><Plus size={14} />{role === 'event_manager' ? 'New event' : role === 'super_admin' ? 'Add campus' : 'Invite manager'}</button>}</div></div>
        <div className="page-transition" key={`${role}-${section}`}>{mainContent()}</div>
      </div>
    </main>
    {notificationsOpen && <Notifications items={notifications} onClose={() => setNotificationsOpen(false)} onRead={async (id) => { await readNotification(id); setNotificationsOpen(false); }} onReadAll={readAllNotifications} onViewAll={() => { setNotificationsOpen(false); navigate('Notifications'); }} />}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
    {modal && <WorkflowModal kind={modal} role={role} campuses={campusOptions} onClose={() => setModal(null)} onSubmit={submitWorkflow} />}
    {rowActionRequest && <RowActionModal request={rowActionRequest} role={role} onClose={() => setRowActionRequest(null)} onSubmit={submitRowAction} />}
  </div>;
}

function Overview({ role, dashboard, onNavigate, onAction }: { role: Role; dashboard: DashboardData | null; onNavigate: (label: string) => void; onAction: (message: string) => void }) {
  const metrics = dashboard?.metrics || [];
  return <section className="overview page-enter"><div className="metrics-grid">{metrics.map((metric, index) => <MetricCard metric={metric} index={index} key={metric.label} />)}</div><div className="analytics-grid"><TrendChart role={role} value={metrics[0]?.display || '0'} onNavigate={onNavigate} /><ProgressPanel role={role} value={dashboard?.health.value} onNavigate={onNavigate} />{role === 'super_admin' && <CampusMap onNavigate={onNavigate} />}</div><div className="operations-grid"><ActivityPanel role={role} items={dashboard?.activity} onNavigate={onNavigate} /><QuickActions role={role} onNavigate={onNavigate} onAction={onAction} /></div></section>;
}

function WorkflowModal({ kind, role, campuses, onClose, onSubmit }: { kind: Exclude<ModalKind, null>; role: Role; campuses: CampusOption[]; onClose: () => void; onSubmit: (kind: Exclude<ModalKind, null>, values: Record<string, string>) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const titles = { event: 'Create event draft', manager: 'Invite admin staff', campus: 'Add campus', post: 'Create campus post' };
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); try { const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>; await onSubmit(kind, values); } finally { setBusy(false); } }
  return <Modal title={titles[kind]} description="This workflow writes to the shared CampusSphere database and records sensitive actions." onClose={onClose}><form onSubmit={submit}><div className="form-fields">
    {kind === 'event' && <><label><span>Event name</span><input name="title" required /></label>{role === 'super_admin' && <label><span>Campus</span><select name="campusId" required defaultValue=""><option value="" disabled>Select a campus</option>{campuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.name}</option>)}</select></label>}<label><span>Venue</span><input name="venueName" /></label><label><span>Starts</span><input name="startsAt" type="datetime-local" required /></label><label><span>Ends</span><input name="endsAt" type="datetime-local" required /></label><label><span>Capacity</span><input name="capacity" type="number" min="1" /></label><label className="field-wide"><span>Description</span><textarea name="description" rows={4} required /></label></>}
    {kind === 'manager' && <><label><span>Work email</span><input name="email" type="email" required /></label><label><span>Role</span><select name="role" defaultValue={role === 'super_admin' ? 'campus_admin' : 'event_manager'}><option value="event_manager">Event Manager</option>{role === 'super_admin' && <option value="campus_admin">Campus Admin</option>}{role === 'super_admin' && <option value="super_admin">Super Admin</option>}</select></label>{role === 'super_admin' && <label><span>Campus</span><select name="campusId" defaultValue=""><option value="">Global (Super Admin only)</option>{campuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.name}</option>)}</select></label>}</>}
    {kind === 'campus' && <><label><span>Campus name</span><input name="name" required /></label><label><span>Slug</span><input name="slug" pattern="[a-z0-9-]+" required /></label><label><span>Country code</span><input name="countryCode" defaultValue="IN" maxLength={2} required /></label></>}
    {kind === 'post' && <><label className="field-wide"><span>Post content</span><textarea name="body" rows={5} required maxLength={2000} /></label>{role === 'super_admin' && <label><span>Campus</span><select name="campusId" required defaultValue=""><option value="" disabled>Select a campus</option>{campuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.name}</option>)}</select></label>}<label><span>Visibility</span><select name="visibility" defaultValue="campus"><option value="campus">Campus</option><option value="global">Global</option></select></label></>}
  </div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}><X size={14} />Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}<ArrowUpRight size={14} /></button></div></form></Modal>;
}

function RowActionModal({ request, role, onClose, onSubmit }: { request: Exclude<RowActionRequest, null>; role: Role; onClose: () => void; onSubmit: (values: Record<string, string>) => Promise<void> }) {
  const { section: targetSection, record } = request;
  const [busy, setBusy] = useState(false);
  const [campusAction, setCampusAction] = useState('edit');
  const [accountAction, setAccountAction] = useState('suspend');
  const title = targetSection === 'Moderation' ? 'Review report' : targetSection === 'Campuses' ? `Manage ${String(record.name || 'campus')}` : targetSection === 'Campus Change Requests' ? 'Decide campus change request' : 'Record actions';
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); try { await onSubmit(Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>); } finally { setBusy(false); } }
  const isModeration = targetSection === 'Moderation';
  const isCampus = targetSection === 'Campuses';
  const isStaff = targetSection === 'Event Managers' || targetSection === 'Staff & Roles';
  const isUser = targetSection === 'Users';
  const isCampusRequest = targetSection === 'Campus Change Requests';
  const security = isUser ? (record.security as any)?.user && record.security : null;
  const superAdmin = role === 'super_admin';
  return <Modal title={title} description={isModeration ? `Reported ${String(record.target_type || 'content')}: ${String(record.target || '')}. ${String(record.details || 'No additional report details were provided.')}` : 'Choose an action to apply through the protected admin API.'} onClose={onClose}><form onSubmit={submit}><div className="form-fields">
    {isModeration && <><label><span>Action</span><select name="action" defaultValue="dismiss"><option value="dismiss">Dismiss report</option><option value="hide">Hide content</option><option value="remove">Remove content</option><option value="warn">Warn user</option><option value="escalate">Escalate for review</option><option value="restore">Restore content</option></select></label><label className="field-wide"><span>Audit reason</span><textarea name="reason" rows={4} placeholder="Explain the moderation decision" /></label></>}
    {isCampusRequest && <><div className="modal-summary"><strong>{String(record.requester || 'User')}</strong><span>Current campus: {String(record.currentCampus || 'Unknown')}</span><span>Requested campus: {String(record.targetCampus || 'Unknown')}</span><span>Reason: {String(record.reason || 'No reason provided')}</span><span>Status: {String(record.status || 'pending')}</span></div><label><span>Decision</span><select name="decision" defaultValue="approve"><option value="approve">Approve campus change</option><option value="reject">Reject request</option></select></label><label className="field-wide"><span>Decision reason</span><textarea name="reason" rows={4} required placeholder="Explain this decision" /></label></>}
    {(targetSection === 'Posts' || targetSection === 'All Content') && <label><span>Post status</span><select name="status" defaultValue={String(record.status || 'published')}><option value="published">Published</option><option value="hidden">Hidden</option><option value="removed">Removed</option><option value="deleted">Deleted</option></select></label>}
    {(targetSection === 'Events' || targetSection === 'Venues & Media') && <label><span>Event status</span><select name="status" defaultValue={String(record.status || 'draft')}><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select></label>}
    {isStaff && <p className="modal-warning">This revokes the selected staff assignment and records the action in the audit log.</p>}
    {isUser && <><div className="modal-summary"><strong>{String(security?.user?.displayName || record.person || record.email || 'User')}</strong><span>{String(security?.user?.email || record.email || '')}</span><span>{security?.user?.phone ? `Phone: ${security.user.phone}` : 'Phone: Not verified'}</span><span>Status: {String(security?.user?.status || record.status || '')}</span><span>Reports against user: {String(security?.reports?.length || record.reportCount || 0)}</span><span>Reports filed by user: {String(security?.filedReports?.length || 0)}</span><span>Devices: {String(security?.devices?.length || record.deviceCount || 0)}</span>{security?.devices?.map((device: any) => <span key={device.id}>Device {device.deviceFingerprint} - {device.platform} - IP {device.lastIp || 'unknown'} - {device.blocked_at ? 'blocked' : device.disabled_at ? 'disabled' : 'active'}</span>)}{security?.loginEvents?.slice(0, 8).map((event: any) => <span key={event.id}>Login {event.outcome} - IP {event.ipAddress || 'unknown'} - {new Date(event.created_at).toLocaleString()}</span>)}</div><label><span>Account action</span><select name="action" value={accountAction} onChange={(event) => setAccountAction(event.target.value)}><option value="suspend">Suspend account</option><option value="ban">Ban account</option><option value="restore">Restore account</option><option value="revoke_sessions">Revoke all sessions</option>{superAdmin && <><option value="block_device">Block a device</option><option value="unbind_device">Remove device binding</option><option value="force_recreate">Force account recreation</option><option value="delete">Delete account</option></>}</select></label>{superAdmin && ['block_device', 'unbind_device'].includes(accountAction) && <label><span>Device</span><select name="deviceId" required defaultValue=""><option value="" disabled>Select a device</option>{security?.devices?.map((device: any) => <option key={device.id} value={device.id}>{device.deviceFingerprint} - {device.platform}</option>)}</select></label>}<label className="field-wide"><span>Reason</span><textarea name="reason" rows={4} required placeholder="Explain this account action" /></label><p className="modal-warning">Device identifiers and IP addresses are protected data. The API returns only the minimum values permitted for your role.</p></>}
    {isCampus && <><label><span>Campus action</span><select name="action" value={campusAction} onChange={(event) => setCampusAction(event.target.value)}><option value="edit">Edit details</option><option value="status">Change status</option><option value="delete">Delete campus</option></select></label>{campusAction === 'edit' && <><label><span>Name</span><input name="name" defaultValue={String(record.name || '')} required /></label><label><span>Slug</span><input name="slug" defaultValue={String(record.slug || '')} pattern="[a-z0-9-]+" required /></label><label><span>Country code</span><input name="countryCode" defaultValue={String(record.country_code || 'IN')} pattern="[A-Z]{2}" maxLength={2} required /></label><label><span>Timezone</span><input name="timezone" defaultValue={String(record.timezone || 'Asia/Kolkata')} required /></label></>}{campusAction === 'status' && <label><span>Status</span><select name="status" defaultValue={String(record.status || 'active')}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}{campusAction === 'delete' && <p className="modal-warning">Only inactive campuses can be deleted. Records that reference this campus will block deletion.</p>}</>}
  </div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}><X size={14} />Cancel</button><button type="submit" className={`button ${campusAction === 'delete' ? 'button-danger' : 'button-primary'}`} disabled={busy}>{busy ? 'Saving...' : isStaff ? 'Revoke assignment' : campusAction === 'delete' ? 'Delete campus' : 'Apply change'}<ArrowUpRight size={14} /></button></div></form></Modal>;
}
