import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

export async function PATCH(request: Request, context: RouteContext<"/api/sales/[id]">) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await backendAuthenticatedRequest(`/sales/${id}`, { method: "PATCH", body: JSON.stringify(await request.json()) }));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível editar a venda." }, { status: error instanceof ApiRequestError ? error.status : 502 });
  }
}
