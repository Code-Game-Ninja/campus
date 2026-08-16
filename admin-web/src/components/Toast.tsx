import { Check, X } from 'lucide-react';

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="toast" role="status" aria-live="polite"><span className="toast-icon"><Check size={14} /></span><span>{message}</span><button onClick={onClose} aria-label="Dismiss message"><X size={14} /></button></div>;
}
