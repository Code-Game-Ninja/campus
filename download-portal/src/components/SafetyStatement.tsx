import { Section } from '@/components/ui/Section';
import { Reveal, RevealItem } from '@/components/ui/Reveal';

const guarantees = [
  {
    title: 'Campus scope is enforced on the server',
    body: 'What you can read is decided by PostgreSQL row-level security, not by the screen you happen to be on. A build with the checks removed still cannot fetch another campus.',
  },
  {
    title: 'Report, block and mute on every surface',
    body: 'Posts, profiles, messages and team requests all carry the same controls, one tap from the content itself instead of buried three menus deep.',
  },
  {
    title: 'You can take your account apart',
    body: 'Request a data export, request a campus change, or request account deletion from Privacy and account. Security and devices signs out one device or all of them.',
  },
];

/** Full-width statement band. No cards, hairlines group the supporting facts. */
export function SafetyStatement() {
  return (
    <Section id="safety">
      <Reveal>
        <p className="max-w-[24ch] font-display text-3xl font-extrabold leading-[1.1] text-ink sm:text-4xl lg:max-w-[30ch] lg:text-[2.75rem]">
          Safety here is a database rule, not a settings page.
        </p>
      </Reveal>

      <Reveal stagger className="mt-12 grid gap-8 border-t border-line pt-10 lg:grid-cols-3 lg:gap-10">
        {guarantees.map((item) => (
          <RevealItem key={item.title}>
            <h3 className="text-base font-bold leading-snug">{item.title}</h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{item.body}</p>
          </RevealItem>
        ))}
      </Reveal>
    </Section>
  );
}
