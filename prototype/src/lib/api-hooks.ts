import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query';
import { apiGet, apiRequest, ApiError } from './api';

export function useApiQuery<T>(key: readonly unknown[], path: string, query: Record<string, string | number | undefined | null> = {}, options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<T, ApiError>({ queryKey: key, queryFn: () => apiGet<T>(path, query), retry: (count, error) => error.status === 0 || error.status >= 500 ? count < 2 : false, ...options });
}

export function useApiMutation<TResponse, TVariables, TContext = unknown>(path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', options?: Omit<UseMutationOptions<TResponse, ApiError, TVariables, TContext>, 'mutationFn'>) {
  return useMutation<TResponse, ApiError, TVariables, TContext>({ mutationFn: (variables) => apiRequest<TResponse>(path, { method, body: variables }), ...options });
}

export function apiQueryKey(scope: string, ...parts: readonly unknown[]): readonly unknown[] { return ['api', scope, ...parts]; }
