import { DownloadSimple } from '@phosphor-icons/react';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Magnetic } from '@/components/ui/Magnetic';

interface FinalCtaProps {
  downloadUrl: string;
  version: string;
}

/**
 * Accent panel sitting on the light page. Same brand colour as every other
 * accent on the site; the page theme itself does not invert.
 */
export function FinalCta({ downloadUrl, version }: FinalCtaProps) {
  return (
    <section className="bg-surface pb-20 sm:pb-28">
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <Reveal>
          <div className="overflow-hidden rounded-sheet bg-brand px-6 py-12 sm:px-12 sm:py-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold leading-[1.1] text-white sm:text-4xl">
                Install it before the next event you miss.
              </h2>
              <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-white/85">
                Version {version} for Android, straight from the project releases page.
              </p>
              <Magnetic className="mt-8 inline-block">
                <ButtonLink
                  href={downloadUrl}
                  size="lg"
                  variant="secondary"
                  className="border-transparent"
                  icon={<DownloadSimple size={20} aria-hidden />}
                >
                  Download APK
                </ButtonLink>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
