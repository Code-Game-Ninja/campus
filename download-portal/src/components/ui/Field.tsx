import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

/*
  Label ABOVE the control, helper text under the label, error BELOW the control.
  Never placeholder-as-label.

  Contrast against the sunken (#F6F7FB) panel these fields sit on:
    label   #101828 -> 16.6:1
    helper  #667085 -> 4.7:1
    error   #D92D20 -> 4.6:1
  Placeholders use text-muted, never text-faint (2.6:1, would fail AA).
*/

const controlBase =
  'w-full rounded-field border bg-surface px-3.5 text-[0.9375rem] text-ink transition-colors duration-200 placeholder:text-muted focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25';

interface FieldShellProps {
  id: string;
  label: string;
  helper?: string;
  error?: string | undefined;
  required?: boolean;
  children: ReactNode;
}

export function FieldShell({ id, label, helper, error, required, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required ? (
          <span className="ml-1 text-critical" aria-hidden>
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-medium text-muted">optional</span>
        )}
      </label>
      {helper ? (
        <p id={`${id}-helper`} className="text-xs leading-relaxed text-muted">
          {helper}
        </p>
      ) : null}
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-critical"
        >
          <WarningCircle size={15} className="mt-px shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<FieldShellProps, 'children'> &
  Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'required'>;

export function TextField({ id, label, helper, error, required, ...rest }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} helper={helper} error={error} required={required}>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={`${controlBase} h-11 ${error ? 'border-critical' : 'border-line-strong'}`}
        {...rest}
      />
    </FieldShell>
  );
}

type TextAreaProps = Omit<FieldShellProps, 'children'> &
  Omit<ComponentPropsWithoutRef<'textarea'>, 'id' | 'required'>;

export function TextAreaField({ id, label, helper, error, required, ...rest }: TextAreaProps) {
  return (
    <FieldShell id={id} label={label} helper={helper} error={error} required={required}>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={`${controlBase} min-h-[9rem] resize-y py-3 leading-relaxed ${error ? 'border-critical' : 'border-line-strong'}`}
        {...rest}
      />
    </FieldShell>
  );
}
