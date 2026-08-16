import { ArrowUpRight, BookOpen, CircleHelp, LifeBuoy, ShieldCheck } from 'lucide-react';

export function HelpView({ onAction }: { onAction: (message: string) => void }) {
  const topics = [
    ['Using the workspace', 'Open an accessible section, search records, export loaded tables, and use row actions for mutations.', BookOpen],
    ['Permission boundaries', 'Every workspace is scoped by the server-resolved admin assignment and campus relationship.', ShieldCheck],
    ['Need a hand?', 'Contact the CampusSphere operations team when an assignment or database workflow needs review.', LifeBuoy],
  ] as const;

  return <section className="help-page page-enter">
    <div className="section-heading"><div><span className="eyebrow">Support</span><h2>Help centre</h2><p>Quick guidance for using the connected admin workspace safely.</p></div><button className="button button-secondary" onClick={() => onAction('Contact the CampusSphere operations owner for account and scope changes.')}><CircleHelp size={14} />Contact support</button></div>
    <div className="help-grid">{topics.map(([title, text, Icon]) => <article className="panel help-card" key={title}><span className="help-icon"><Icon size={18} /></span><h3>{title}</h3><p>{text}</p><button className="text-button" onClick={() => onAction(text)}>Read guidance <ArrowUpRight size={14} /></button></article>)}</div>
  </section>;
}
