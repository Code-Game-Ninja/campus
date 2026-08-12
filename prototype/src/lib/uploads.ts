import { apiPost, uploadResourceObject } from './api';

export type ResourceType = 'notes' | 'past_paper' | 'assignment' | 'lab_manual' | 'presentation';
export type UploadStage = 'intent' | 'storage' | 'complete';

export interface UploadIntent { resourceId: string; storageKey: string; uploadUrl: string; expiresAt: string }
export interface CompleteUploadResponse { resourceId: string; status: 'approved' }

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
  if (!intent.storageKey || !intent.uploadUrl.startsWith('supabase://study-resources/')) {
    throw new Error('Backend returned an invalid study-resource upload destination.');
  }
  const content = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  await uploadResourceObject(intent.storageKey, content, mimeType);
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
