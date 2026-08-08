import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export const MAX_RESOURCE_BYTES = 50 * 1024 * 1024;

export const RESOURCE_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
] as const;

export type ResourceMimeType = (typeof RESOURCE_MIME_TYPES)[number];

export interface PickedStudyDocument {
  uri: string;
  name: string;
  size: number;
  mimeType: ResourceMimeType;
  blob?: Blob;
}

const MIME_BY_EXTENSION: Record<string, ResourceMimeType> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
};

interface NativeDocumentAsset {
  uri?: string;
  name?: string;
  size?: number;
  mimeType?: string;
}

interface NativeDocumentResult extends NativeDocumentAsset {
  canceled?: boolean;
  type?: 'success' | 'cancel';
  assets?: NativeDocumentAsset[] | null;
}

interface ExpoDocumentPickerModule {
  getDocumentAsync(options: {
    type: readonly string[];
    copyToCacheDirectory: boolean;
    multiple: boolean;
  }): Promise<NativeDocumentResult>;
}

function normalizeAsset(asset: NativeDocumentAsset, blob?: Blob): PickedStudyDocument {
  const name = asset.name?.trim() ?? '';
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!name || !mimeType) {
    throw new Error('Choose a PDF, DOCX, PPTX, or TXT file.');
  }

  const size = blob?.size || asset.size || 0;
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('Could not read this file size. Choose another file.');
  }
  if (size > MAX_RESOURCE_BYTES) {
    throw new Error('File is larger than the 50 MB upload limit.');
  }
  if (!blob && !asset.uri) {
    throw new Error('Could not access this file. Choose another file.');
  }

  return { uri: asset.uri ?? '', name, size, mimeType, blob };
}

async function pickOnWeb(): Promise<PickedStudyDocument | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.pptx,.txt';
    input.multiple = false;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(normalizeAsset({ name: file.name, size: file.size, mimeType: file.type }, file));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

/** Pick one academic document on Android/iOS or web without exposing file paths. */
export async function pickStudyDocument(): Promise<PickedStudyDocument | null> {
  if (Platform.OS === 'web') return pickOnWeb();

  let picker: ExpoDocumentPickerModule;
  try {
    picker = requireNativeModule<ExpoDocumentPickerModule>('ExpoDocumentPicker');
  } catch {
    throw new Error('Document picker is unavailable in this build. Rebuild the app with expo-document-picker installed.');
  }

  const result = await picker.getDocumentAsync({
    type: RESOURCE_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.type === 'cancel') return null;
  return normalizeAsset(result.assets?.[0] ?? result);
}
