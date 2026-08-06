import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await backendAuthenticatedRequest(`/purchasing/purchases/${id}/cancel`, { method: "POST", headers: { "Idempotency-Key": request.headers.get("Idempotency-Key") ?? "" } }));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível cancelar a compra." }, { status: error instanceof ApiRequestError ? error.status : 502 });
  }
}
