import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export function Modal({ title, description, children, onClose }: { title: string; description: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="eyebrow">Synthetic workflow</span><h2 id="modal-title">{title}</h2><p>{description}</p></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={17} /></button></div>{children}</section>
  </div>;
}
