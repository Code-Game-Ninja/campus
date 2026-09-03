import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle, Info, PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { TextField, TextAreaField, FieldShell } from '@/components/ui/Field';
import { FileDrop } from '@/components/ui/FileDrop';
import {
  isSubmissionLive,
  isUploadLive,
  REPORT_KINDS,
  submitFeedback,
  type FeedbackInput,
  type ReportKind,
} from '@/lib/feedback';
import { easeOutExpo } from '@/lib/motion';

type Status = 'idle' | 'submitting' | 'sent' | 'failed';
type Errors = Partial<Record<'email' | 'message' | 'file', string>>;

const MIN_MESSAGE = 20;
const MAX_MESSAGE = 4000;

const emptyForm = {
  kind: 'bug' as ReportKind,
  name: '',
  email: '',
  campus: '',
  appVersion: '',
  message: '',
};

function validate(values: typeof emptyForm): Errors {
  const errors: Errors = {};

  if (!values.email.trim()) {
    errors.email = 'We need an email address to reply to you.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = 'That does not look like a complete email address.';
  }

  const message = values.message.trim();
  if (message.length < MIN_MESSAGE) {
    errors.message = `Give us at least ${MIN_MESSAGE} characters so the report is actionable.`;
  } else if (message.length > MAX_MESSAGE) {
    errors.message = `Keep it under ${MAX_MESSAGE} characters.`;
  }

  return errors;
}

interface ReportFormProps {
  /** Prefills the version field with whatever the release band resolved. */
  defaultVersion: string;
}

export function ReportForm({ defaultVersion }: ReportFormProps) {
  const reduce = useReducedMotion();
  const [values, setValues] = useState({ ...emptyForm, appVersion: defaultVersion });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [failure, setFailure] = useState('');

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === 'email' || key === 'message') {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setStatus('submitting');
    setFailure('');

    const payload: FeedbackInput = {
      kind: values.kind,
      name: values.name.trim(),
      email: values.email.trim(),
      campus: values.campus.trim(),
      appVersion: values.appVersion.trim(),
      message: values.message.trim(),
      file,
    };

    try {
      await submitFeedback(payload);
      setStatus('sent');
      setValues({ ...emptyForm, appVersion: defaultVersion });
      setFile(null);
    } catch (error) {
      setStatus('failed');
      setFailure(
        error instanceof Error
          ? error.message
          : 'Something went wrong on the way out. Try again in a moment.',
      );
    }
  };

  if (status === 'sent') {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
        className="rounded-sheet border border-line bg-surface p-8 text-center"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-positive-soft text-positive">
          <CheckCircle size={26} aria-hidden />
        </span>
        <h3 className="mt-5 text-xl font-bold">
          {isSubmissionLive ? 'Report sent' : 'Form validated in preview mode'}
        </h3>
        <p className="mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed text-muted">
          {isSubmissionLive
            ? 'It reached the team. If it needs a reply you will get one on the email you gave us.'
            : 'No form backend is configured yet, so nothing was delivered. Set VITE_WEB3FORMS_KEY to start receiving real reports.'}
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => setStatus('idle')}>
          Send another
        </Button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-sheet border border-line bg-surface p-6 sm:p-8"
    >
      {isSubmissionLive ? null : (
        <p className="mb-6 flex items-start gap-2.5 rounded-card border border-line bg-sunken p-3.5 text-xs leading-relaxed text-body">
          <Info size={16} className="mt-px shrink-0 text-brand-deep" aria-hidden />
          <span>
            Preview mode. The form validates and shows every state, but no backend is wired yet, so
            submissions are not delivered.
          </span>
        </p>
      )}

      <FieldShell id="report-kind" label="What is this about" required>
        <div className="grid gap-2 sm:grid-cols-2">
          {REPORT_KINDS.map((option) => {
            const selected = values.kind === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-2.5 rounded-field border px-3.5 py-3 text-sm font-medium transition-colors duration-200 ${
                  selected
                    ? 'border-brand bg-brand-tint text-brand-deep'
                    : 'border-line-strong bg-surface text-body hover:border-brand'
                }`}
              >
                <input
                  type="radio"
                  name="report-kind"
                  value={option.value}
                  checked={selected}
                  onChange={() => set('kind', option.value)}
                  className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </FieldShell>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <TextField
          id="report-name"
          label="Your name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          placeholder="Ananya Deshmukh"
          autoComplete="name"
          maxLength={80}
        />
        <TextField
          id="report-email"
          label="Email"
          required
          error={errors.email}
          value={values.email}
          onChange={(event) => set('email', event.target.value)}
          placeholder="you@college.edu"
          type="email"
          autoComplete="email"
          maxLength={140}
        />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <TextField
          id="report-campus"
          label="Campus"
          value={values.campus}
          onChange={(event) => set('campus', event.target.value)}
          placeholder="Which college are you at"
          maxLength={120}
        />
        <TextField
          id="report-version"
          label="App version"
          helper="Shown on the app profile screen."
          value={values.appVersion}
          onChange={(event) => set('appVersion', event.target.value)}
          placeholder="1.0.0"
          maxLength={20}
        />
      </div>

      <div className="mt-5">
        <TextAreaField
          id="report-message"
          label="What happened"
          required
          error={errors.message}
          helper="What you were doing, what you expected, and what happened instead."
          value={values.message}
          onChange={(event) => set('message', event.target.value)}
          placeholder="I opened the Notes hub, searched for a subject, and the list stayed empty even though..."
          maxLength={MAX_MESSAGE}
        />
        <p className="mt-1.5 text-right text-xs text-muted">
          {values.message.trim().length} / {MAX_MESSAGE}
        </p>
      </div>

      {isUploadLive || !isSubmissionLive ? (
        <div className="mt-5">
          <FieldShell id="report-file" label="Screenshot" error={errors.file}>
            <FileDrop
              file={file}
              error={errors.file}
              onFile={(next) => {
                setFile(next);
                setErrors((current) => ({ ...current, file: undefined }));
              }}
              onReject={(reason) => setErrors((current) => ({ ...current, file: reason }))}
            />
          </FieldShell>
        </div>
      ) : null}

      <AnimatePresence>
        {status === 'failed' ? (
          <motion.p
            role="alert"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: easeOutExpo }}
            className="mt-5 flex items-start gap-2.5 overflow-hidden rounded-card border border-critical bg-critical-soft p-3.5 text-sm leading-relaxed text-critical"
          >
            <WarningCircle size={17} className="mt-0.5 shrink-0" aria-hidden />
            {failure}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          loading={status === 'submitting'}
          disabled={status === 'submitting'}
          icon={<PaperPlaneTilt size={19} aria-hidden />}
        >
          {status === 'submitting' ? 'Sending' : 'Send report'}
        </Button>
        <p className="text-xs leading-relaxed text-muted">
          Goes to the three people who build the app.
        </p>
      </div>
    </form>
  );
}
