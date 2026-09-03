import type { Icon } from '@phosphor-icons/react';
import { DeviceMobile, DownloadSimple, EnvelopeSimple } from '@phosphor-icons/react';

export interface InstallStep {
  /** Verb label. Deliberately not "Step 1 / Step 2". */
  label: string;
  body: string;
  icon: Icon;
}

export const installSteps: InstallStep[] = [
  {
    label: 'Download',
    body: 'Grab the APK from the button above. It comes straight from the project GitHub Releases page, not a mirror.',
    icon: DownloadSimple,
  },
  {
    label: 'Allow the install',
    body: 'Open the file and approve the one-time prompt that lets your browser install apps from outside the Play Store.',
    icon: DeviceMobile,
  },
  {
    label: 'Sign in',
    body: 'Enter your email, type the six-digit code we send back, pick your university, and you are in.',
    icon: EnvelopeSimple,
  },
];
