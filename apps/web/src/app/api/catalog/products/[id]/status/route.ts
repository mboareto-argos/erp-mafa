import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

export async function PATCH(request: Request, context: RouteContext<"/api/catalog/products/[id]/status">) {
  const { id } = await context.params;
  try {
    const { action } = (await request.json()) as { action: "activate" | "deactivate" };
    const step = action === "activate" ? "reactivate" : "deactivate";
    return NextResponse.json(
      await backendAuthenticatedRequest(`/catalog/products/${id}/${step}`, { method: "PATCH" }),
    );
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível atualizar o status do produto." }, { status });
  }
}
