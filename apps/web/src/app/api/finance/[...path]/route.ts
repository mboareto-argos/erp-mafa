import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

async function forward(request: Request, context: RouteContext<"/api/finance/[...path]">, method: "GET" | "POST") {
  const { path } = await context.params;
  // Este BFF é limitado aos recursos financeiros; autorização continua sendo
  // aplicada pela API Nest em cada endpoint.
  const allowed = new Set(["expenses", "payables", "receivables", "cash-flow/transactions", "cash-flow/transfers"]);
  const target = path.join("/");
  const isSettlement = /^(receivables|payables)\/[0-9a-f-]{36}\/pay$/.test(target);
  if (!allowed.has(target) && !isSettlement) return NextResponse.json({ message: "Recurso financeiro inválido." }, { status: 404 });
  try {
    const query = new URL(request.url).search;
    const body = method === "POST" ? JSON.stringify(await request.json()) : undefined;
    return NextResponse.json(await backendAuthenticatedRequest(`/${target}${query}`, { method, body }));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível concluir a operação financeira." }, { status: error instanceof ApiRequestError ? error.status : 502 });
  }
}
export async function GET(request: Request, context: RouteContext<"/api/finance/[...path]">) { return forward(request, context, "GET"); }
export async function POST(request: Request, context: RouteContext<"/api/finance/[...path]">) { return forward(request, context, "POST"); }
