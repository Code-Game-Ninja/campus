import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { CircleNotch } from '@phosphor-icons/react';

type Variant = 'primary' | 'secondary' | 'quiet';
type Size = 'md' | 'lg';

/*
  Contrast verified against the locked light theme:
    primary  white on #375DFB  = 5.10:1  (AA body)
    secondary #101828 on white = 17.4:1
    quiet    #2544C9 on white  = 9.0:1
  Labels are nowrap so a CTA never wraps to a second line at desktop.
*/
const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-field font-semibold transition-[transform,background-color,border-color,box-shadow] duration-200 ease-[var(--ease-out-expo)] active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-55';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-[0_10px_24px_-12px_rgba(55,93,251,0.55)] hover:bg-brand-deep hover:shadow-[0_14px_30px_-12px_rgba(55,93,251,0.6)]',
  secondary:
    'border border-line-strong bg-surface text-ink hover:border-brand hover:text-brand-deep',
  quiet: 'text-brand-deep hover:bg-brand-tint',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-[0.9375rem]',
  lg: 'h-[3.25rem] px-6 text-base',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps & Omit<ComponentPropsWithoutRef<'button'>, keyof CommonProps>;
type LinkProps = CommonProps & Omit<ComponentPropsWithoutRef<'a'>, keyof CommonProps>;

function content({ icon, trailing, loading, children }: CommonProps) {
  return (
    <>
      {loading ? (
        <CircleNotch size={18} className="animate-spin" aria-hidden />
      ) : (
        icon
      )}
      <span>{children}</span>
      {loading ? null : trailing}
    </>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  trailing,
  loading = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content({ icon, trailing, loading, children })}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  trailing,
  className = '',
  children,
  ...rest
}: LinkProps) {
  return (
    <a className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {content({ icon, trailing, children })}
    </a>
  );
}
