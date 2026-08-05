import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await backendAuthenticatedRequest("/inventory/adjustments", { method: "POST", headers: { "Idempotency-Key": request.headers.get("Idempotency-Key") ?? "" }, body: JSON.stringify(await request.json()) }));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível registrar o ajuste." }, { status: error instanceof ApiRequestError ? error.status : 502 });
  }
}
