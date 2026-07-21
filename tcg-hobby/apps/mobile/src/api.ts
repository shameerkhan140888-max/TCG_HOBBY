import type { PublicApiError } from '@tcg-hobby/types';
import { mobileConfig } from './config';

export const API_BASE_URL = mobileConfig.apiOrigin;

export class ApiError extends Error {
  constructor(public readonly code: PublicApiError['code'], message: string, public readonly status: number) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  if (!path.startsWith('/')) throw new ApiError('VALIDATION', 'API paths must start with a slash.', 0);
  const method = (options.method ?? 'GET').toUpperCase();
  const attempts = method === 'GET' ? 2 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...options.headers,
        },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as PublicApiError | null;
        const error = new ApiError(body?.code ?? 'SERVER', body?.message ?? 'The request could not be completed.', response.status);
        if (attempt + 1 < attempts && response.status >= 500) continue;
        throw error;
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const mapped = error instanceof Error && error.name === 'AbortError'
        ? new ApiError('TIMEOUT', 'The request timed out. Try again.', 0)
        : new ApiError('NETWORK', 'Unable to connect. Check your connection and try again.', 0);
      if (attempt + 1 >= attempts) throw mapped;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ApiError('NETWORK', 'Unable to connect. Check your connection and try again.', 0);
}
