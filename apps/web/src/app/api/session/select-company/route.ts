import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ApiRequestError,
  backendRequest,
  PREAUTH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const preauthToken = cookieStore.get(PREAUTH_TOKEN_COOKIE)?.value;
  if (!preauthToken) {
    return NextResponse.json({ message: "Sua sessão de acesso expirou. Entre novamente." }, { status: 401 });
  }

  try {
    const { companyId } = await request.json();
    const result = (await backendRequest("/auth/select-company", {
      method: "POST",
      body: JSON.stringify({ preauthToken, companyId }),
    })) as { accessToken: string; refreshToken: string };
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACCESS_TOKEN_COOKIE, result.accessToken, sessionCookieOptions(900));
    response.cookies.set(REFRESH_TOKEN_COOKIE, result.refreshToken, sessionCookieOptions(60 * 60 * 24 * 30));
    response.cookies.delete(PREAUTH_TOKEN_COOKIE);
    return response;
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    const message = error instanceof Error ? error.message : "Não foi possível selecionar a empresa.";
    return NextResponse.json({ message }, { status });
  }
}
