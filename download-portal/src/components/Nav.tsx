import { useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { DownloadSimple, List, X } from '@phosphor-icons/react';


const links = [
  { href: '#features', label: 'Features' },
  { href: '#screens', label: 'Screens' },
  { href: '#install', label: 'Install' },
  { href: '#report', label: 'Report' },
  { href: '#faq', label: 'FAQ' },
];

interface NavProps {
  downloadUrl: string;
}

/**
 * Single-line desktop nav at 68px. Motion: the surface gains a border and a
 * blur once the page scrolls, which is state feedback (you have left the hero),
 * not decoration. Scroll progress comes from useScroll, never a scroll listener.
 */
export function Nav({ downloadUrl }: NavProps) {
  const { scrollY } = useScroll();
  const [lifted, setLifted] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useMotionValueEvent(scrollY, 'change', (value) => {
    setLifted(value > 24);
  });

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div
        className={`transition-[background-color,border-color,backdrop-filter] duration-300 ease-[var(--ease-out-expo)] ${
          lifted
            ? 'nav-lifted border-b border-line bg-surface/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-[68px] w-full max-w-[1180px] items-center gap-6 px-5 sm:px-8">
          <a href="#top" className="flex shrink-0 items-center gap-2.5">
            <img
              src="/logo-96.webp"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-[8px]"
            />
            <span className={`font-display text-[1.0625rem] font-bold tracking-[-0.01em] transition-colors ${lifted ? 'text-ink' : 'text-white'}`}>
              CampusSphere
            </span>
          </a>

          <nav className="ml-auto hidden items-center gap-2 lg:flex">
            <div className={`flex items-center gap-1 rounded-full px-1 py-1 ring-1 backdrop-blur transition-colors ${lifted ? 'bg-black/5 ring-black/10' : 'bg-white/10 ring-white/15'}`}>
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium rounded-full transition-colors ${lifted ? 'text-ink/80 hover:text-ink' : 'text-white/80 hover:text-white'}`}
                >
                  {link.label}
                </a>
              ))}
              <a
                href={downloadUrl}
                className={`ml-1 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${lifted ? 'bg-brand text-white hover:bg-brand-deep' : 'bg-white text-ink hover:bg-white/90'}`}
              >
                Download APK
                <DownloadSimple size={18} aria-hidden />
              </a>
            </div>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-field border transition-colors lg:hidden ${lifted ? 'border-line-strong text-ink hover:border-brand' : 'border-white/15 text-white/90 bg-white/10 backdrop-blur'}`}
          >
            {open ? <X size={18} aria-hidden /> : <List size={18} aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <motion.nav
          id="mobile-nav"
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="mx-5 mt-2 overflow-hidden rounded-card border border-line bg-surface p-2 shadow-[0_20px_50px_-24px_rgba(16,24,40,0.28)] lg:hidden"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-field px-3 py-3 text-sm font-medium text-body transition-colors hover:bg-sunken hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </motion.nav>
      ) : null}
    </header>
  );
}
