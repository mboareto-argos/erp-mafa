import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  backendRequest,
  PREAUTH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  sessionCookieOptions,
} from '@/lib/session';
import { safeNext } from '@/lib/safe-next';

// Retoma a sessão quando o token de acesso (15 min) venceu mas o de
// renovação (30 dias) ainda vale — ex.: o app ficou fechado no celular.
// Renova e volta para onde a pessoa ia. Se a renovação falhar (revogada,
// usuário removido), limpa tudo e manda para o login.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const refreshToken = (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    try {
      const session = (await backendRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })) as { accessToken: string; refreshToken: string };
      const response = NextResponse.redirect(new URL(next, request.url));
      response.cookies.set(
        ACCESS_TOKEN_COOKIE,
        session.accessToken,
        sessionCookieOptions(900),
      );
      response.cookies.set(
        REFRESH_TOKEN_COOKIE,
        session.refreshToken,
        sessionCookieOptions(60 * 60 * 24 * 30),
      );
      return response;
    } catch {
      // segue para o login abaixo
    }
  }

  const response = NextResponse.redirect(new URL('/entrar', request.url));
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(PREAUTH_TOKEN_COOKIE);
  return response;
}
