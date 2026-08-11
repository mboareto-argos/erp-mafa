import 'server-only';

import { cookies } from 'next/headers';

export const ACCESS_TOKEN_COOKIE = 'erp_mafa_access';
export const REFRESH_TOKEN_COOKIE = 'erp_mafa_refresh';
export const PREAUTH_TOKEN_COOKIE = 'erp_mafa_preauth';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

export type SessionTokens = { accessToken: string; refreshToken: string };

export type ApiErrorPayload = {
  error?: { code?: string; message?: string; field?: string };
  message?: string;
};

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function backendRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => ({}))) as ApiErrorPayload;
    throw new ApiRequestError(
      response.status,
      payload.error?.message ??
        payload.message ??
        'Não foi possível concluir esta ação.',
    );
  }

  if (response.status === 204) return null;
  return response.json() as Promise<unknown>;
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function readAccessToken() {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getSession() {
  const accessToken = await readAccessToken();
  if (!accessToken) return null;

  try {
    return await backendRequest('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) return null;
    throw error;
  }
}

export async function backendAuthenticatedRequest(
  path: string,
  init?: RequestInit,
) {
  const accessToken = await readAccessToken();
  if (!accessToken)
    throw new ApiRequestError(401, 'Sessão expirada. Faça login novamente.');
  return backendRequest(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  });
}
