import { useI18nStore, translate, type TranslationKey } from "./i18n";

const API_BASE = "/api";

export interface ApiError {
  error: string;
  code?: string;
}

export class ApiRequestError extends Error {
  code?: string;
  waitSeconds?: number;
  constructor(message: string, code?: string, waitSeconds?: number) {
    super(message);
    this.code = code;
    this.waitSeconds = waitSeconds;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("pilot_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const language = useI18nStore.getState().language;
    const code = data.code as string | undefined;
    const key = code ? (`errors.${code}` as TranslationKey) : undefined;
    const translated = key ? translate(language, key) : undefined;
    // translate() vraci samotny klic zpet, pokud preklad chybi - v tom
    // pripade radeji spadneme zpet na text z API nebo obecnou hlasku.
    const message =
      translated && translated !== key ? translated : data.error || translate(language, "errors.generic");
    throw new ApiRequestError(message, code, data.waitSeconds);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};
