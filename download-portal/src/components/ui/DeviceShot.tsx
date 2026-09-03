interface DeviceShotProps {
  /** File under public/screens/ */
  file: string;
  alt: string;
  /**
   * 'full' renders the whole 1080x2392 capture.
   * 'peek' crops to the top of the screen and lets the frame bleed downward.
   */
  mode?: 'full' | 'peek';
  /** Skip lazy loading for above-the-fold shots. */
  priority?: boolean;
  /** Hides the shot from assistive tech. Use for purely decorative duplicates. */
  decorative?: boolean;
  className?: string;
}

/**
 * Consistent frame for the real device captures. Deliberately simple: a rounded
 * bezel and one tinted shadow, nothing that pretends to be a rendered phone.
 */
export function DeviceShot({
  file,
  alt,
  mode = 'full',
  priority = false,
  decorative = false,
  className = '',
}: DeviceShotProps) {
  return (
    <div
      aria-hidden={decorative || undefined}
      className={`overflow-hidden rounded-[1.625rem] border border-line bg-sunken shadow-[0_30px_70px_-42px_rgba(16,24,40,0.45)] ${className}`}
    >
      <img
        src={`/screens/${file}`}
        alt={alt}
        width={640}
        height={1418}
        loading={priority ? 'eager' : 'lazy'}
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        className={
          mode === 'peek'
            ? 'h-full w-full object-cover object-top'
            : 'block aspect-[1080/2392] w-full object-cover'
        }
      />
    </div>
  );
}
