import { GithubLogo } from '@phosphor-icons/react';
import { Section, SectionHead } from '@/components/ui/Section';
import { Reveal, RevealItem } from '@/components/ui/Reveal';
import { projectGithubUrl, team } from '@/data/team';

/**
 * Asymmetric 6/3/3 grid so the row is not three identical cards. Names, roles
 * and focus areas come from the team data the app itself renders.
 */
export function Team() {
  return (
    <Section id="team" tone="sunken">
      <Reveal>
        <SectionHead
          title="Three people build this"
          body="Ownership is split by track, and the same three names show up in the app under Developers."
        />
      </Reveal>

      <Reveal stagger className="mt-12 grid gap-4 lg:grid-cols-12 lg:gap-5">
        {team.map((member) => (
          <RevealItem
            key={member.name}
            className={`${member.span} flex flex-col rounded-sheet border border-line bg-surface p-6 sm:p-7`}
          >
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft font-display text-base font-extrabold text-brand-deep"
            >
              {member.initials}
            </span>
            <h3 className="mt-5 text-lg font-bold">{member.name}</h3>
            <p className="mt-1 text-sm font-medium text-brand-deep">{member.role}</p>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{member.bio}</p>
            <ul className="mt-5 grid gap-1.5 border-t border-line pt-4">
              {member.focus.map((item) => (
                <li key={item} className="text-xs leading-relaxed text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </RevealItem>
        ))}
      </Reveal>

      <Reveal className="mt-8">
        <a
          href={projectGithubUrl}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-deep transition-colors hover:text-brand"
        >
          <GithubLogo size={17} aria-hidden />
          Read the source
        </a>
      </Reveal>
    </Section>
  );
}
