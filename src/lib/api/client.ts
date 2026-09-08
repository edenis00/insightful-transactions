/**
 * Single API entry point.
 *
 * When VITE_API_BASE_URL is set, every call goes to the Python/FastAPI
 * backend over REST. When it is not set (frontend-only demonstration),
 * calls are served by the local mock handler. No component talks to the
 * mock layer directly.
 */
import { mockHandler } from "./mock-handler";

export const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "";
export const TOKEN_KEY = "vantage_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
}

function buildQuery(query?: RequestOptions["query"]) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query } = options;
  const token = getToken();

  if (!API_BASE_URL) {
    return mockHandler<T>(path, { method, body, query, token });
  }

  const res = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    let message = friendlyMessage(res.status);
    try {
      const data = (await res.json()) as { detail?: string; message?: string };
      if (data.detail || data.message) message = data.detail ?? data.message!;
    } catch {
      /* keep friendly default */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function friendlyMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request could not be processed. Please check the details entered.";
    case 401:
      return "Your session is no longer valid. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested record could not be found.";
    case 409:
      return "That record already exists.";
    case 422:
      return "Some of the information entered is not valid.";
    default:
      return "Something went wrong. Please try again.";
  }
}
