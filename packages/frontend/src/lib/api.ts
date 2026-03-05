const BASE_URL = '/api/v1';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const options: RequestInit = {
    method,
    signal: AbortSignal.timeout(30_000),
  };

  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, options);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new ApiError('Request timed out', 'TIMEOUT', 0);
    }
    throw new ApiError(
      'Unable to connect to the server. Check your network connection.',
      'NETWORK_ERROR',
      0,
    );
  }

  if (res.status === 204) return undefined as T;

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(
      'Server returned an unexpected response',
      'PARSE_ERROR',
      res.status,
    );
  }

  if (!res.ok) {
    const err = json as { error?: { message?: string; code?: string; details?: Record<string, unknown> } };
    throw new ApiError(
      err.error?.message ?? 'Request failed',
      err.error?.code ?? 'UNKNOWN',
      res.status,
      err.error?.details,
    );
  }

  return json as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string, body?: unknown) => request<void>('DELETE', path, body),
};
