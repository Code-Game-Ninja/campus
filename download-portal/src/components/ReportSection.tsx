import { GithubLogo } from '@phosphor-icons/react';
import { Section, SectionHead } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ReportForm } from '@/components/ReportForm';
import { REPO_URL } from '@/lib/release';

interface ReportSectionProps {
  version: string;
}

const helpful = [
  'The screen you were on and what you tapped',
  'What you expected, and what the app did instead',
  'A screenshot if the layout looks wrong',
  'Your campus, if it only happens for you',
];

export function ReportSection({ version }: ReportSectionProps) {
  return (
    <Section id="report" tone="sunken">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <Reveal className="lg:col-span-5">
          <SectionHead
            eyebrow="Report and suggest"
            title="Found a bug, or thought of something better?"
            body="This form is the fastest route into the project. Every submission lands with the team that ships the app, not a ticket queue."
          />

          <div className="mt-8 border-t border-line pt-6">
            <p className="text-sm font-semibold text-ink">What makes a report easy to fix</p>
            <ul className="mt-3 grid gap-2">
              {helpful.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <a
            href={`${REPO_URL}/issues`}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-deep transition-colors hover:text-brand"
          >
            <GithubLogo size={17} aria-hidden />
            Prefer GitHub issues
          </a>
        </Reveal>

        <Reveal className="lg:col-span-7">
          <ReportForm defaultVersion={version} />
        </Reveal>
      </div>
    </Section>
  );
}
