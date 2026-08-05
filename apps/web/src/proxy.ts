import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/inicio", "/vendas", "/clientes", "/produtos", "/compras", "/fornecedores", "/estoque", "/financeiro"];

export function proxy(request: NextRequest) {
  const hasAccessToken = Boolean(request.cookies.get("erp_mafa_access")?.value);
  const pathname = request.nextUrl.pathname;
  if (protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) && !hasAccessToken) return NextResponse.redirect(new URL("/entrar", request.url));
  if ((pathname === "/entrar" || pathname === "/cadastro") && hasAccessToken) return NextResponse.redirect(new URL("/inicio", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/inicio/:path*", "/vendas/:path*", "/clientes/:path*", "/produtos/:path*", "/compras/:path*", "/fornecedores/:path*", "/estoque/:path*", "/financeiro/:path*", "/entrar", "/cadastro"] };
