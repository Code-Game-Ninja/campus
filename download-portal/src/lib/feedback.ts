/*
  Report + suggestion submission pipeline.

  Files cannot ride along with a free form-backend plan (Web3Forms, Formcarry
  and Formspree all gate attachments behind paid tiers), so the screenshot goes
  straight from the browser to Cloudinary via an unsigned upload preset and only
  the resulting URL is sent with the form fields.

  SECURITY: an unsigned Cloudinary preset is a public write surface. Anyone who
  reads the bundle can upload to it. Before going live, in the Cloudinary
  console set the preset to: unsigned, incoming transformation limited to
  images, max file size 5 MB, a dedicated folder, and moderation enabled.
  Constants below mirror those limits client-side; the console settings are the
  ones that actually enforce them.
*/

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',');

const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY ?? '';
const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD ?? '';
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET ?? '';

/** True once a form backend is configured. Drives the preview-mode notice. */
export const isSubmissionLive = WEB3FORMS_KEY.length > 0;
/** True once Cloudinary is configured. When false the file picker is hidden. */
export const isUploadLive = CLOUDINARY_CLOUD.length > 0 && CLOUDINARY_PRESET.length > 0;

export const REPORT_KINDS = [
  { value: 'bug', label: 'Something is broken' },
  { value: 'suggestion', label: 'Feature suggestion' },
  { value: 'content', label: 'Report content or a user' },
  { value: 'account', label: 'Account or sign-in help' },
] as const;

export type ReportKind = (typeof REPORT_KINDS)[number]['value'];

export interface FeedbackInput {
  kind: ReportKind;
  name: string;
  email: string;
  campus: string;
  appVersion: string;
  message: string;
  file: File | null;
}

export class FeedbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackError';
  }
}

export function describeFileProblem(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return 'Screenshots must be PNG, JPG or WebP.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'That file is over 5 MB. Crop it or lower the quality and try again.';
  }
  return null;
}

async function uploadScreenshot(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', CLOUDINARY_PRESET);
  body.append('folder', 'campussphere/portal-reports');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body },
  );

  if (!response.ok) {
    throw new FeedbackError('The screenshot upload failed. Send the report without it, or retry.');
  }

  const payload = (await response.json()) as { secure_url?: string };
  if (!payload.secure_url) {
    throw new FeedbackError('Cloudinary accepted the upload but returned no URL.');
  }
  return payload.secure_url;
}

const KIND_SUBJECTS: Record<ReportKind, string> = {
  bug: 'Bug report',
  suggestion: 'Feature suggestion',
  content: 'Content report',
  account: 'Account help request',
};

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  if (!isSubmissionLive) {
    // Preview mode. The UI states this plainly rather than faking a success.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return;
  }

  let screenshotUrl = '';
  if (input.file && isUploadLive) {
    screenshotUrl = await uploadScreenshot(input.file);
  }

  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject: `CampusSphere portal: ${KIND_SUBJECTS[input.kind]}`,
      from_name: 'CampusSphere download portal',
      // Honeypot field; Web3Forms drops the submission when it is filled.
      botcheck: '',
      kind: input.kind,
      name: input.name,
      email: input.email,
      campus: input.campus || 'Not provided',
      app_version: input.appVersion || 'Not provided',
      message: input.message,
      screenshot: screenshotUrl || 'None attached',
      page: window.location.href,
    }),
  });

  if (!response.ok) {
    throw new FeedbackError(
      'The report could not be delivered. Check your connection and try again.',
    );
  }
}
