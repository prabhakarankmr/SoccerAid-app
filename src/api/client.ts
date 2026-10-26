import { API_VERSION, env } from '../config/env';
import { useAuthStore } from '../stores/authStore';

interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, canRetry = true): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${env.apiUrl}/api/${API_VERSION}${path}`, {
    ...options,
    headers: {
      // Only set when there's a body — Fastify's JSON body parser rejects an empty body if
      // Content-Type says json (DELETE, and any bodyless GET, has no body to parse).
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && canRetry) {
    const refreshed = await useAuthStore.getState().refreshSession();

    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorEnvelope | null;
    throw new ApiError(
      body?.error.code ?? 'UNKNOWN',
      body?.error.message ?? 'Request failed',
      body?.error.details,
    );
  }

  const body = (await res.json()) as { data: T };
  return body.data;
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' }),
};
