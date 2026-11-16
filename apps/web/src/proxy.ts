import { NextResponse, type NextRequest } from 'next/server';

const protectedPaths = [
  '/inicio',
  '/vendas',
  '/clientes',
  '/produtos',
  '/compras',
  '/fornecedores',
  '/estoque',
  '/financeiro',
  '/importacoes',
  '/configuracoes',
];

export function proxy(request: NextRequest) {
  const hasAccessToken = Boolean(request.cookies.get('erp_mafa_access')?.value);
  const hasRefreshToken = Boolean(
    request.cookies.get('erp_mafa_refresh')?.value,
  );
  const { pathname, search } = request.nextUrl;
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isAuthPage = pathname === '/entrar' || pathname === '/cadastro';

  // Token de acesso venceu (app fechado por mais de 15 min) mas a sessão de
  // 30 dias ainda vale: renova sem pedir login de novo.
  if (!hasAccessToken && hasRefreshToken && (isProtected || isAuthPage)) {
    const resume = new URL('/api/session/resume', request.url);
    resume.searchParams.set(
      'next',
      isProtected ? `${pathname}${search}` : '/inicio',
    );
    return NextResponse.redirect(resume);
  }
  if (isProtected && !hasAccessToken)
    return NextResponse.redirect(new URL('/entrar', request.url));
  if (isAuthPage && hasAccessToken)
    return NextResponse.redirect(new URL('/inicio', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/inicio/:path*',
    '/vendas/:path*',
    '/clientes/:path*',
    '/produtos/:path*',
    '/compras/:path*',
    '/fornecedores/:path*',
    '/estoque/:path*',
    '/financeiro/:path*',
    '/importacoes/:path*',
    '/configuracoes/:path*',
    '/entrar',
    '/cadastro',
  ],
};
