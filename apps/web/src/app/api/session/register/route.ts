import { NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  ApiRequestError,
  backendRequest,
  REFRESH_TOKEN_COOKIE,
  sessionCookieOptions,
} from '@/lib/session';

export async function POST(request: Request) {
  try {
    const result = (await backendRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(await request.json()),
    })) as { accessToken: string; refreshToken: string };
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      result.accessToken,
      sessionCookieOptions(900),
    );
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      sessionCookieOptions(60 * 60 * 24 * 30),
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível criar sua conta.',
      },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}
