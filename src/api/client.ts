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

// Without this, an unreachable API (wrong host, cold-starting backend, dropped connection) can
// leave `fetch` neither resolving nor rejecting — the caller's loading state then never settles
// into an error, so nothing downstream (e.g. the logged-out redirect in app/(tabs)/_layout.tsx)
// ever gets a chance to run.
const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(path: string, options: RequestInit = {}, canRetry = true): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}/api/${API_VERSION}${path}`, {
      ...options,
      signal: timeoutController.signal,
      headers: {
        // Only set when there's a body — Fastify's JSON body parser rejects an empty body if
        // Content-Type says json (DELETE, and any bodyless GET, has no body to parse).
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }

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
