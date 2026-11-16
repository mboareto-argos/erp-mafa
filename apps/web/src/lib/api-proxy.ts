import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

// Repasse simples para a API com a sessão do usuário. Permissão e
// isolamento por empresa são sempre da API (TA-SEC-001).
export async function forward(
  path: string,
  init: RequestInit | undefined,
  fallback: string,
) {
  try {
    return NextResponse.json(await backendAuthenticatedRequest(path, init));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : fallback },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}

export const isUuid = (id: string) => /^[0-9a-f-]{36}$/.test(id);

export const notFound = (message = 'Não encontrado.') =>
  NextResponse.json({ message }, { status: 404 });
