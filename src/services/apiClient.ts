/**
 * Lightweight API client with backend/offline mode.
 * If VITE_API_BASE_URL is set, requests go to the real backend.
 * Otherwise, callers fall back to local services (current MVP behavior).
 */

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  authToken?: string;
};

function getEnv() {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env ?? {};
}

export function getApiBaseUrl(): string {
  // Default to localhost:4000 if no environment variable is provided
  return (getEnv().VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
}

export function isBackendConfigured(): boolean {
  // In a real app, we always assume a backend is expected for features like GitHub OAuth
  return true; 
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError("Backend is not configured.", 503, "BACKEND_OFFLINE");
  }

  const response = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error: string }).error)
        : `Request failed with ${response.status}`;
    const code =
      typeof payload === "object" && payload && "code" in payload
        ? String((payload as { code?: string }).code)
        : undefined;
    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}

const TOKEN_KEY = "javify-access-token";
const REFRESH_KEY = "javify-refresh-token";

export const tokenStore = {
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setAccessToken(token: string | null) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  setRefreshToken(token: string | null) {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
