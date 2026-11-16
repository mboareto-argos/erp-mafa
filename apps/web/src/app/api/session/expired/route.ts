import { NextResponse } from 'next/server';

// Sessão que o backend não reconheceu (token de acesso vencido ou
// revogado): tenta retomar pelo token de renovação antes de pedir login
// de novo. Ver /api/session/resume.
export function GET(request: Request) {
  return NextResponse.redirect(
    new URL('/api/session/resume?next=/inicio', request.url),
  );
}
