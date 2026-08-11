import { NextResponse } from 'next/server';
import {
  ApiRequestError,
  backendRequest,
  PREAUTH_TOKEN_COOKIE,
  sessionCookieOptions,
} from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await backendRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const response = NextResponse.json(result);
    const preauthToken = (result as { preauthToken: string }).preauthToken;
    response.cookies.set(
      PREAUTH_TOKEN_COOKIE,
      preauthToken,
      sessionCookieOptions(600),
    );
    return response;
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    const message =
      error instanceof Error ? error.message : 'Não foi possível entrar.';
    return NextResponse.json({ message }, { status });
  }
}
