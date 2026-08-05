import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

export async function PATCH(request: Request, context: RouteContext<"/api/purchasing/suppliers/[id]">) {
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await backendAuthenticatedRequest(`/purchasing/suppliers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(await request.json()),
      }),
    );
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível editar o fornecedor." }, { status });
  }
}
