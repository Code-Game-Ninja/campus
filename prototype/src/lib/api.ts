import { mockGet, mockRequest } from '../data/mockBackend';

export const API_BASE_URL = 'http://mock-api';

let accessToken: string | null = null;
let unauthorizedHandler: (() => Promise<boolean>) | null = null;
const accessTokenListeners = new Set<(token: string | null) => void>();
export function setAccessToken(token: string | null): void {
  if (accessToken === token) return;
  accessToken = token;
  for (const listener of accessTokenListeners) listener(token);
}
export function getAccessToken(): string | null { return accessToken; }
export function subscribeAccessToken(listener: (token: string | null) => void): () => void {
  accessTokenListeners.add(listener);
  return () => accessTokenListeners.delete(listener);
}
export function registerUnauthorizedHandler(handler: () => Promise<boolean>): void { unauthorizedHandler = handler; }

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const simulateDelay = <T>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), 300));

export async function apiGet<T>(path: string, query: Record<string, string | number | undefined | null> = {}, retry401 = true): Promise<T> {
  const normalizedPath = path.replace(/^\/|\/$/g, '');
  return simulateDelay(mockGet(normalizedPath, query) as T);
}

export async function apiRequest<T>(path: string, init: { method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; idempotencyKey?: string; retry401?: boolean; headers?: Record<string, string> }): Promise<T> {
  const normalizedPath = path.replace(/^\/|\/$/g, '');
  return simulateDelay(mockRequest(normalizedPath, init.method, init.body) as T);
}

export const apiPost = <T>(path: string, body?: unknown, idempotencyKey?: string) => apiRequest<T>(path, { method: 'POST', body, idempotencyKey });
export const apiPatch = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body });
export const apiPut = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body });
export const apiDelete = <T = void>(path: string) => apiRequest<T>(path, { method: 'DELETE' });
