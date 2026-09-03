import { DownloadSimple } from '@phosphor-icons/react';
import { Section, SectionHead } from '@/components/ui/Section';
import { Reveal, RevealItem } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { installSteps } from '@/data/install';

interface InstallStepsProps {
  downloadUrl: string;
}

/**
 * Install flow as a vertical rail. No card boxes and no numbered "Step 1"
 * labels: the verb is the label, and the rail carries the sequence.
 */
export function InstallSteps({ downloadUrl }: InstallStepsProps) {
  return (
    <Section id="install" tone="sunken">
      <Reveal>
        <SectionHead
          title="Installing takes about a minute"
          body="Android asks one extra question when an app does not come from the Play Store. Here is the whole flow."
        />
      </Reveal>

      <Reveal stagger className="mt-12 max-w-3xl">
        {installSteps.map((step, index) => {
          const Icon = step.icon;
          const last = index === installSteps.length - 1;

          return (
            <RevealItem key={step.label} className="relative flex gap-5 pb-9 last:pb-0">
              {last ? null : (
                <span
                  aria-hidden
                  className="absolute left-[1.375rem] top-12 bottom-2 w-px bg-line-strong"
                />
              )}
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-brand-deep">
                <Icon size={21} aria-hidden />
              </span>
              <div className="pt-1.5">
                <h3 className="text-lg font-bold">{step.label}</h3>
                <p className="mt-2 max-w-[58ch] text-[0.9375rem] leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            </RevealItem>
          );
        })}
      </Reveal>

      <Reveal className="mt-10">
        <ButtonLink href={downloadUrl} size="lg" icon={<DownloadSimple size={20} aria-hidden />}>
          Download APK
        </ButtonLink>
      </Reveal>
    </Section>
  );
}
