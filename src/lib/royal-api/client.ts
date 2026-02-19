import { prisma } from "@/lib/prisma";
import type { RoyalApiResponse, TokenResponse } from "./types";

const BASE_URL = process.env.ROYAL_API_BASE_URL || "https://test-api.etscore.com";
const USERNAME = process.env.ROYAL_API_USERNAME || "";
const PASSWORD = process.env.ROYAL_API_PASSWORD || "";

let tokenPromise: Promise<string> | null = null;

async function getStoredToken(): Promise<string | null> {
  const token = await prisma.royalApiToken.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (token && new Date(token.expiresAt) > new Date()) {
    return token.accessToken;
  }
  return null;
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Royal API login failed: ${res.status}`);
  }

  const data: RoyalApiResponse<TokenResponse> = await res.json();
  if (!data.isSuccess) {
    throw new Error(`Royal API login error: ${data.message}`);
  }

  await prisma.royalApiToken.create({
    data: {
      accessToken: data.result.accessToken,
      refreshToken: data.result.refreshToken,
      expiresAt: new Date(data.result.expiration),
    },
  });

  return data.result.accessToken;
}

async function getAccessToken(): Promise<string> {
  const stored = await getStoredToken();
  if (stored) return stored;

  // Mutex: prevent concurrent login calls
  if (!tokenPromise) {
    tokenPromise = login().finally(() => {
      tokenPromise = null;
    });
  }
  return tokenPromise;
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    retry?: boolean;
  } = {}
): Promise<T> {
  const { method = "GET", body, retry = true } = options;
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expired - retry once with fresh token
  if (res.status === 401 && retry) {
    // Invalidate stored token
    await prisma.royalApiToken.deleteMany({});
    return request<T>(path, { method, body, retry: false });
  }

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Royal API error ${res.status}: ${errorBody}`);
  }

  const data: RoyalApiResponse<T> = await res.json();
  if (!data.isSuccess) {
    throw new Error(`Royal API error: ${data.message}`);
  }

  return data.result;
}

export const royalApiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
