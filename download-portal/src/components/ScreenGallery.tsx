import { useState } from 'react';
import { ImageBroken } from '@phosphor-icons/react';
import { Section, SectionHead } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { screens, type ScreenShot } from '@/data/screens';

const frame =
  'overflow-hidden rounded-[1.625rem] border border-line bg-sunken shadow-[0_30px_70px_-42px_rgba(16,24,40,0.45)]';

/**
 * Real device captures. Handles its own image loading rather than reusing
 * DeviceShot so a screens.ts entry with no matching file degrades to a labelled
 * empty slot instead of a broken image.
 */
function ScreenTile({ shot }: { shot: ScreenShot }) {
  const [missing, setMissing] = useState(false);

  return (
    <figure className="w-[228px] shrink-0 snap-start sm:w-[252px]">
      {missing ? (
        <div
          className={`${frame} flex aspect-[1080/2392] w-full flex-col items-center justify-center gap-2 border-dashed border-line-strong px-5 text-center shadow-none`}
        >
          <ImageBroken size={24} className="text-muted" aria-hidden />
          <p className="text-sm font-semibold text-ink">{shot.label}</p>
          <p className="text-xs leading-relaxed text-muted">
            Add public/screens/{shot.file} to show this screen.
          </p>
        </div>
      ) : (
        <div className={frame}>
          <img
            src={`/screens/${shot.file}`}
            alt={`CampusSphere ${shot.label} screen on Android`}
            width={640}
            height={1418}
            loading="lazy"
            onError={() => setMissing(true)}
            className="block aspect-[1080/2392] w-full object-cover"
          />
        </div>
      )}
      <figcaption className="mt-4">
        <span className="block text-sm font-semibold text-ink">{shot.label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{shot.caption}</span>
      </figcaption>
    </figure>
  );
}

export function ScreenGallery() {
  return (
    <Section id="screens">
      <Reveal>
        <SectionHead
          title="Six screens you will live in"
          body="Captured from the build on this page. Nothing here is a mockup."
        />
      </Reveal>

      <Reveal className="mt-10">
        <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 [scrollbar-width:thin]">
          {screens.map((shot) => (
            <ScreenTile key={shot.file} shot={shot} />
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
