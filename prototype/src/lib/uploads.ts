import { apiPost } from './api';

export type ResourceType = 'notes' | 'past_paper' | 'assignment' | 'lab_manual' | 'presentation';
export type UploadStage = 'intent' | 'storage' | 'complete';

export interface UploadIntent { resourceId: string; uploadUrl: string; expiresAt: string }
export interface CompleteUploadResponse { resourceId: string; status: 'needs_review' }

export interface UploadMetadata {
  title: string;
  description?: string;
  type: ResourceType;
  mimeType: string;
  bytes: number;
}

export async function createUploadIntent(input: UploadMetadata): Promise<UploadIntent> {
  return apiPost<UploadIntent>('/resources/upload-intents', input);
}

export async function uploadToIntent(intent: UploadIntent, mimeType: string, data: Blob | ArrayBuffer): Promise<void> {
  if (intent.uploadUrl.startsWith('mock://')) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return;
  }
  const azure = new URL(intent.uploadUrl).hostname.endsWith('.blob.core.windows.net');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(intent.uploadUrl, {
      method: 'PUT',
      headers: {
        ...(azure ? { 'x-ms-blob-type': 'BlockBlob' } : { 'x-upsert': 'false' }),
        'Content-Type': mimeType,
      },
      body: data,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Storage upload failed (${response.status})`);
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new Error('Storage upload timed out. Check your connection and retry.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function completeUploadIntent(resourceId: string, bytes: number): Promise<CompleteUploadResponse> {
  return apiPost<CompleteUploadResponse>(
    `/resources/${resourceId}/complete-upload`,
    { bytes },
    `upload-complete-${resourceId}`,
  );
}

/** Direct-to-private-storage upload. API owns object key/authz and completion/scan state. */
export async function uploadWithIntent(
  input: UploadMetadata & { data: Blob | ArrayBuffer },
  onStage?: (stage: UploadStage) => void,
): Promise<UploadIntent> {
  onStage?.('intent');
  const intent = await createUploadIntent(input);
  onStage?.('storage');
  await uploadToIntent(intent, input.mimeType, input.data);
  onStage?.('complete');
  await completeUploadIntent(intent.resourceId, input.bytes);
  return intent;
}
