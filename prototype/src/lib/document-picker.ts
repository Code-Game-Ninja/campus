import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import * as ImagePicker from 'expo-image-picker';

export const MAX_RESOURCE_BYTES = 50 * 1024 * 1024;

export const RESOURCE_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
] as const;

export type ResourceMimeType = (typeof RESOURCE_MIME_TYPES)[number];

export const MAX_CHAT_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const CHAT_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/zip',
] as const;

export type ChatAttachmentMimeType = (typeof CHAT_ATTACHMENT_MIME_TYPES)[number];
export const MAX_POST_MEDIA_BYTES = 10 * 1024 * 1024;
export const POST_MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export type PostMediaMimeType = (typeof POST_MEDIA_MIME_TYPES)[number];

export interface PickedStudyDocument {
  uri: string;
  name: string;
  size: number;
  mimeType: ResourceMimeType;
  blob?: Blob;
}

export interface PickedChatAttachment {
  uri: string;
  name: string;
  size: number;
  mimeType: ChatAttachmentMimeType;
  blob?: Blob;
}

export interface PickedPostMedia {
  uri: string;
  name: string;
  size: number;
  mimeType: PostMediaMimeType;
  mediaType: 'image' | 'document';
  blob?: Blob;
}

const MIME_BY_EXTENSION: Record<string, ResourceMimeType> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
};

const CHAT_MIME_BY_EXTENSION: Record<string, ChatAttachmentMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  txt: 'text/plain',
  zip: 'application/zip',
};

const POST_MIME_BY_EXTENSION: Record<string, PostMediaMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
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

function normalizeChatAttachment(asset: NativeDocumentAsset, blob?: Blob): PickedChatAttachment {
  const name = asset.name?.trim() ?? '';
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = CHAT_MIME_BY_EXTENSION[extension];
  if (!name || !mimeType) throw new Error('Choose an image, PDF, TXT, or ZIP file.');
  const size = blob?.size || asset.size || 0;
  if (!Number.isFinite(size) || size <= 0) throw new Error('Could not read this file size. Choose another file.');
  if (size > MAX_CHAT_ATTACHMENT_BYTES) throw new Error('File is larger than the 20 MB chat upload limit.');
  if (!blob && !asset.uri) throw new Error('Could not access this file. Choose another file.');
  return { uri: asset.uri ?? '', name, size, mimeType, blob };
}

async function pickChatAttachmentOnWeb(): Promise<PickedChatAttachment | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.zip';
    input.multiple = false;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(normalizeChatAttachment({ name: file.name, size: file.size, mimeType: file.type }, file));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

function normalizePostMedia(asset: NativeDocumentAsset, blob?: Blob, fallbackMimeType?: string, fallbackName?: string): PickedPostMedia {
  const name = asset.name?.trim() || fallbackName?.trim() || '';
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = POST_MIME_BY_EXTENSION[extension] ?? (fallbackMimeType && POST_MEDIA_MIME_TYPES.includes(fallbackMimeType as PostMediaMimeType) ? fallbackMimeType as PostMediaMimeType : undefined);
  if (!name || !mimeType) throw new Error('Choose a JPG, PNG, WEBP, or PDF file.');
  const size = blob?.size || asset.size || 0;
  if (!Number.isFinite(size) || size <= 0) throw new Error('Could not read this file size. Choose another file.');
  if (size > MAX_POST_MEDIA_BYTES) throw new Error('File is larger than the 10 MB post upload limit.');
  if (!blob && !asset.uri) throw new Error('Could not access this file. Choose another file.');
  return { uri: asset.uri ?? '', name, size, mimeType, mediaType: mimeType.startsWith('image/') ? 'image' : 'document', blob };
}

async function pickPostMediaOnWeb(): Promise<PickedPostMedia | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.webp,.pdf';
    input.multiple = false;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(normalizePostMedia({ name: file.name, size: file.size, mimeType: file.type }, file));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

async function pickPostDocumentOnWeb(): Promise<PickedPostMedia | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.multiple = false;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(normalizePostMedia({ name: file.name, size: file.size, mimeType: file.type }, file));
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

/** Pick one private chat attachment supported by the Supabase storage bucket. */
export async function pickChatAttachment(): Promise<PickedChatAttachment | null> {
  if (Platform.OS === 'web') return pickChatAttachmentOnWeb();

  let picker: ExpoDocumentPickerModule;
  try {
    picker = requireNativeModule<ExpoDocumentPickerModule>('ExpoDocumentPicker');
  } catch {
    throw new Error('Document picker is unavailable in this build. Rebuild the app with expo-document-picker installed.');
  }

  const result = await picker.getDocumentAsync({
    type: CHAT_ATTACHMENT_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.type === 'cancel') return null;
  return normalizeChatAttachment(result.assets?.[0] ?? result);
}

/** Pick one image or PDF for a post. Call repeatedly to build a multi-image post. */
export async function pickPostMedia(): Promise<PickedPostMedia | null> {
  if (Platform.OS === 'web') return pickPostMediaOnWeb();

  let picker: ExpoDocumentPickerModule;
  try {
    picker = requireNativeModule<ExpoDocumentPickerModule>('ExpoDocumentPicker');
  } catch {
    throw new Error('Document picker is unavailable in this build. Rebuild the app with expo-document-picker installed.');
  }
  const result = await picker.getDocumentAsync({ type: POST_MEDIA_MIME_TYPES, copyToCacheDirectory: true, multiple: false });
  if (result.canceled || result.type === 'cancel') return null;
  return normalizePostMedia(result.assets?.[0] ?? result);
}

/** Pick/crop one post image. Android shows native crop, zoom, and rotate controls. */
export async function pickPostImage(): Promise<PickedPostMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 5],
    quality: 0.9,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const name = asset.fileName?.trim() || 'campussphere-photo.jpg';
  return normalizePostMedia({ uri: asset.uri, name, size: asset.fileSize, mimeType: asset.mimeType }, undefined, asset.mimeType, name);
}

/** Pick one PDF for a post without invoking image crop UI. */
export async function pickPostDocument(): Promise<PickedPostMedia | null> {
  if (Platform.OS === 'web') return pickPostDocumentOnWeb();
  let picker: ExpoDocumentPickerModule;
  try {
    picker = requireNativeModule<ExpoDocumentPickerModule>('ExpoDocumentPicker');
  } catch {
    throw new Error('Document picker is unavailable in this build. Rebuild the app with expo-document-picker installed.');
  }
  const result = await picker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled || result.type === 'cancel') return null;
  return normalizePostMedia(result.assets?.[0] ?? result);
}
