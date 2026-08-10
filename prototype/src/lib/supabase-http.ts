const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export interface SupabaseHttpErrorBody {
  message?: string;
  msg?: string;
  error?: string;
  error_description?: string;
  code?: string;
  hint?: string;
  details?: string;
}

export class SupabaseHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: string,
  ) {
    super(message);
    this.name = 'SupabaseHttpError';
  }
}

export function assertSupabaseConfigured(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new SupabaseHttpError(
      'CampusSphere backend is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      0,
      'SUPABASE_NOT_CONFIGURED',
    );
  }
}

export function getSupabaseUrl(): string {
  assertSupabaseConfigured();
  return SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  assertSupabaseConfigured();
  return SUPABASE_ANON_KEY;
}

async function parseResponse(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function errorFrom(response: Response, payload: unknown): SupabaseHttpError {
  const body = payload && typeof payload === 'object' ? payload as SupabaseHttpErrorBody : {};
  const message = body.message ?? body.msg ?? body.error_description ?? body.error
    ?? (typeof payload === 'string' ? payload : `Backend request failed (${response.status}).`);
  return new SupabaseHttpError(message, response.status, body.code, body.details ?? body.hint);
}

export async function supabaseRequest<T>(
  service: 'auth' | 'rest' | 'storage',
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    accessToken?: string | null;
    body?: unknown;
    rawBody?: Blob;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  assertSupabaseConfigured();
  const prefix = service === 'auth' ? '/auth/v1' : service === 'storage' ? '/storage/v1' : '/rest/v1';
  const hasRawBody = options.rawBody !== undefined;
  const response = await fetch(`${SUPABASE_URL}${prefix}/${path.replace(/^\/+/, '')}`, {
    method: options.method ?? 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${options.accessToken || SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
      ...(options.body === undefined || hasRawBody ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    body: hasRawBody ? options.rawBody : options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw errorFrom(response, payload);
  return payload as T;
}

function storageObjectPath(bucket: string, objectPath: string): string {
  const encodedBucket = encodeURIComponent(bucket);
  const encodedPath = objectPath.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${encodedBucket}/${encodedPath}`;
}

export async function uploadStorageObject(
  bucket: string,
  objectPath: string,
  content: Blob,
  mimeType: string,
  accessToken: string,
): Promise<void> {
  await supabaseRequest('storage', `object/${storageObjectPath(bucket, objectPath)}`, {
    method: 'POST',
    accessToken,
    rawBody: content,
    headers: { 'Content-Type': mimeType, 'x-upsert': 'false' },
  });
}

export async function deleteStorageObject(
  bucket: string,
  objectPath: string,
  accessToken: string,
): Promise<void> {
  await supabaseRequest('storage', `object/${storageObjectPath(bucket, objectPath)}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function createStorageSignedUrl(
  bucket: string,
  objectPath: string,
  accessToken: string,
  expiresIn = 60,
): Promise<string> {
  const result = await supabaseRequest<{ signedURL?: string; signedUrl?: string }>(
    'storage',
    `object/sign/${storageObjectPath(bucket, objectPath)}`,
    { method: 'POST', accessToken, body: { expiresIn } },
  );
  const signedPath = result.signedURL ?? result.signedUrl;
  if (!signedPath) throw new SupabaseHttpError('Could not create attachment download link.', 500, 'SIGNED_URL_MISSING');
  if (signedPath.startsWith('http')) return signedPath;
  if (signedPath.startsWith('/storage/v1/')) return `${SUPABASE_URL}${signedPath}`;
  return `${SUPABASE_URL}/storage/v1/${signedPath.replace(/^\/+/, '')}`;
}

export function postgrestQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
