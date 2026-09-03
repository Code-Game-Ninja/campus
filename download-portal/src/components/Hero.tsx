import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, DownloadSimple } from '@phosphor-icons/react';
import { ButtonLink } from '@/components/ui/Button';
import { DeviceShot } from '@/components/ui/DeviceShot';
import { Magnetic } from '@/components/ui/Magnetic';
import { easeOutExpo, staggerParent, riseChild } from '@/lib/motion';

interface HeroProps {
  downloadUrl: string;
}

/**
 * Asymmetric split hero. Text elements: headline, subtext, CTA row. No eyebrow,
 * no version chip, no trust strip; release facts live in the band below.
 */
export function Hero({ downloadUrl }: HeroProps) {
  const reduce = useReducedMotion();

  return (
    <section id="top" className="relative overflow-hidden bg-surface">
      {/*
        Space backdrop added as requested.
      */}
      <div className="relative min-h-[100dvh]">
        <img
            src="https://cdn.21st.dev/assets/mirror/a8/a8cf38f65f7315f95eba8c803c4a80a9d78cb2ea36fbfee49828396e4a0b9737.jpg"
            alt=""
            className="w-full h-full object-cover absolute top-0 right-0 bottom-0 left-0"
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-black/30" />

        {/* Fades the field out before it reaches the release band below. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-linear-to-b from-transparent to-surface z-10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-linear-to-b from-transparent to-surface"
        />

        <div className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[1180px] items-center gap-12 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:pt-24">
        <motion.div
          className="lg:col-span-6"
          initial={reduce ? false : 'hidden'}
          animate="visible"
          variants={staggerParent}
        >
          <motion.h1
            variants={riseChild}
            className="text-4xl font-extrabold leading-[1.06] sm:text-5xl lg:text-6xl text-white"
          >
            Your whole campus,
            <br />
            in one app.
          </motion.h1>

          <motion.p
            variants={riseChild}
            className="mt-5 max-w-[46ch] text-base leading-relaxed text-white/80 sm:text-lg"
          >
            Feed, events, study notes, team finder, listings and realtime chat, scoped to your
            college instead of the whole internet.
          </motion.p>

          <motion.div variants={riseChild} className="mt-9 flex flex-wrap items-center gap-3">
            <Magnetic>
              <ButtonLink
                href={downloadUrl}
                size="lg"
                icon={<DownloadSimple size={20} aria-hidden />}
              >
                Download APK
              </ButtonLink>
            </Magnetic>
            <ButtonLink
              href="#features"
              size="lg"
              variant="secondary"
              trailing={<ArrowRight size={18} aria-hidden />}
            >
              Explore features
            </ButtonLink>
          </motion.div>
        </motion.div>

        <motion.div
          className="lg:col-span-6"
          initial={reduce ? false : { opacity: 0, scale: 0.965, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.85, ease: easeOutExpo, delay: 0.12 }}
        >
          {/*
            Two real captures, overlapped. The back shot is decorative so it is
            hidden from assistive tech; the front one carries the description.
          */}
          <div className="relative mx-auto flex max-w-[30rem] justify-center lg:max-w-none">
            <div
              aria-hidden
              className="absolute inset-x-6 bottom-6 top-10 rounded-sheet bg-brand-soft/80"
            />
            <DeviceShot
              file="discover.webp"
              alt=""
              decorative
              className="relative mt-10 hidden w-[42%] max-w-[13.5rem] -rotate-6 sm:block"
            />
            <DeviceShot
              file="home.webp"
              alt="CampusSphere home feed on an Android phone, showing the campus feed for Central University of Rajasthan"
              priority
              className="relative -ml-6 w-[62%] max-w-[19rem] rotate-2 sm:-ml-10"
            />
          </div>
        </motion.div>
        </div>
      </div>
    </section>
  );
}
