import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

function failure(error: unknown, fallback: string) {
  return NextResponse.json({ message: error instanceof Error ? error.message : fallback }, { status: error instanceof ApiRequestError ? error.status : 502 });
}

export async function GET() { try { return NextResponse.json(await backendAuthenticatedRequest("/purchasing/purchases")); } catch (error) { return failure(error, "Não foi possível carregar as compras."); } }
export async function POST(request: Request) { try { return NextResponse.json(await backendAuthenticatedRequest("/purchasing/purchases", { method: "POST", body: JSON.stringify(await request.json()) })); } catch (error) { return failure(error, "Não foi possível criar a compra."); } }
