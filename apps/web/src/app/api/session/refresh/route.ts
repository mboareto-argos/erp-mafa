import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, ApiRequestError, backendRequest, REFRESH_TOKEN_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST() {
  const refreshToken = (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  try {
    const session = (await backendRequest("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) })) as { accessToken: string; refreshToken: string };
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACCESS_TOKEN_COOKIE, session.accessToken, sessionCookieOptions(900));
    response.cookies.set(REFRESH_TOKEN_COOKIE, session.refreshToken, sessionCookieOptions(60 * 60 * 24 * 30));
    return response;
  } catch (error) {
    const response = NextResponse.json({ message: error instanceof Error ? error.message : "Sessão expirada." }, { status: error instanceof ApiRequestError ? error.status : 502 });
    response.cookies.delete(ACCESS_TOKEN_COOKIE); response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }
}
