import { NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  PREAUTH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/session';

// Sessão que o backend não reconhece mais (usuário removido, empresa
// inexistente, token revogado): apaga os cookies e volta ao login. Sem isso
// o proxy, que só olha se o cookie existe, devolveria /entrar → /inicio em
// loop.
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/entrar', request.url));
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(PREAUTH_TOKEN_COOKIE);
  return response;
}
