import { NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  ApiRequestError,
  backendRequest,
  PREAUTH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  sessionCookieOptions,
} from '@/lib/session';

type LoginResult = {
  preauthToken: string;
  companies: { companyId: string; companyName: string; roleName: string }[];
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = (await backendRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as LoginResult;

    // Quem tem acesso a uma única empresa entra direto, sem a tela de
    // escolha. A seleção continua passando pelo backend (/auth/select-company
    // valida o Membership — TA-TENANT-002); só o clique extra é removido.
    if (result.companies.length === 1) {
      const tokens = (await backendRequest('/auth/select-company', {
        method: 'POST',
        body: JSON.stringify({
          preauthToken: result.preauthToken,
          companyId: result.companies[0].companyId,
        }),
      })) as { accessToken: string; refreshToken: string };
      const response = NextResponse.json({
        companies: result.companies,
        autoSelected: true,
      });
      response.cookies.set(
        ACCESS_TOKEN_COOKIE,
        tokens.accessToken,
        sessionCookieOptions(900),
      );
      response.cookies.set(
        REFRESH_TOKEN_COOKIE,
        tokens.refreshToken,
        sessionCookieOptions(60 * 60 * 24 * 30),
      );
      response.cookies.delete(PREAUTH_TOKEN_COOKIE);
      return response;
    }

    // O token de pré-autenticação só trafega em cookie httpOnly, nunca no
    // corpo da resposta.
    const response = NextResponse.json({ companies: result.companies });
    response.cookies.set(
      PREAUTH_TOKEN_COOKIE,
      result.preauthToken,
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
