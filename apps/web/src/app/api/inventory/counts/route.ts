import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await backendAuthenticatedRequest("/inventory/counts", { method: "POST", body: JSON.stringify(await request.json().catch(() => ({}))) }));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível iniciar o inventário." }, { status: error instanceof ApiRequestError ? error.status : 502 });
  }
}
