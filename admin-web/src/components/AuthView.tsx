import { ArrowRight, Check, KeyRound, LockKeyhole, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { sendOtp, verifyOtp } from '../lib/api';
import { Logo } from './Logo';

export function AuthView({ onAuthenticated }: { onAuthenticated: () => Promise<void> | void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid staff email to continue.'); return; }
    setBusy(true); setError('');
    try { await sendOtp(email); setStep('code'); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not send the verification code.'); }
    finally { setBusy(false); }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) { setError('Enter the six-digit verification code.'); return; }
    setBusy(true); setError('');
    try { await verifyOtp(email, code); await onAuthenticated(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not verify this admin account.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell"><div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" /><div className="auth-grid" />
    <section className="auth-stage"><div className="auth-brand"><Logo /></div><div className="auth-card"><div className="auth-heading"><span className="auth-kicker"><span className="pulse-dot" />Protected admin access</span><h1>{step === 'email' ? 'Welcome back.' : 'Verify your workspace.'}</h1><p>{step === 'email' ? 'Sign in with an assigned staff email to continue.' : `We sent a six-digit code to ${email}.`}</p></div>
      {step === 'email' ? <form key="email-step" className="auth-form auth-step" onSubmit={submitEmail}><label><span>Work email</span><div className="auth-input"><Mail size={16} /><input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@campus.edu" autoComplete="email" /></div></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Sending code...' : 'Continue with email'} <ArrowRight size={16} /></button><p className="auth-note"><LockKeyhole size={13} /> Your role and campus scope are resolved by the protected server.</p></form> : <form key="code-step" className="auth-form auth-step" onSubmit={submitCode}><div className="code-heading"><span className="code-icon"><KeyRound size={17} /></span><span><strong>Verification code</strong><small>Use the code delivered by Supabase Auth.</small></span></div><label><span>Six-digit code</span><div className="auth-input"><KeyRound size={16} /><input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="123456" autoComplete="one-time-code" /></div></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Verifying...' : 'Enter admin workspace'} <ArrowRight size={16} /></button><button className="auth-back" type="button" onClick={() => { setStep('email'); setError(''); setCode(''); }}>Use a different email</button></form>}
      <div className="auth-trust"><span><Check size={12} /> Scope-aware</span><span><Check size={12} /> Audit recorded</span><span><Check size={12} /> Supabase secured</span></div>
    </div><footer className="auth-footer"><span>CampusSphere Admin</span><span>Connected build / v0.2</span></footer></section>
  </main>;
}
