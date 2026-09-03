import { GithubLogo } from '@phosphor-icons/react';
import { REPO_URL } from '@/lib/release';
import { projectGithubUrl } from '@/data/team';

const columns = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Screens', href: '#screens' },
      { label: 'Install guide', href: '#install' },
      { label: 'Report or suggest', href: '#report' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    heading: 'Project',
    links: [
      { label: 'Source', href: projectGithubUrl },
      { label: 'Releases', href: `${REPO_URL}/releases` },
      { label: 'Issues', href: `${REPO_URL}/issues` },
      { label: 'Team', href: '#team' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-sunken py-14">
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-6">
            <a href="#top" className="flex items-center gap-2.5">
              <img src="/logo-96.webp" alt="" width={32} height={32} className="h-8 w-8 rounded-[8px]" />
              <span className="font-display text-[1.0625rem] font-bold tracking-[-0.01em] text-ink">
                CampusSphere
              </span>
            </a>
            <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-muted">
              A campus community app for Indian colleges. Android build distributed through GitHub
              Releases while the project is early.
            </p>
            <a
              href={projectGithubUrl}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-deep transition-colors hover:text-brand"
            >
              <GithubLogo size={17} aria-hidden />
              Code-Game-Ninja
            </a>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="lg:col-span-3">
              <p className="text-sm font-bold text-ink">{column.heading}</p>
              <ul className="mt-3 grid gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-brand-deep"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-12 border-t border-line pt-6 text-xs text-muted">
          Android is a trademark of Google LLC. CampusSphere is not affiliated with Google.
        </p>
      </div>
    </footer>
  );
}
