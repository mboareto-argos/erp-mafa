import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

export async function PATCH(request: Request, context: RouteContext<"/api/catalog/products/[id]">) {
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await backendAuthenticatedRequest(`/catalog/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(await request.json()),
      }),
    );
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível editar o produto." }, { status });
  }
}
