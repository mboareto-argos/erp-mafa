import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";
const fail = (e: unknown) => NextResponse.json({ message: e instanceof Error ? e.message : "Não foi possível concluir esta ação." }, { status: e instanceof ApiRequestError ? e.status : 502 });
export async function GET() { try { return NextResponse.json(await backendAuthenticatedRequest("/financial-accounts")); } catch (e) { return fail(e); } }
export async function POST(request: Request) { try { return NextResponse.json(await backendAuthenticatedRequest("/financial-accounts", { method: "POST", body: JSON.stringify(await request.json()) })); } catch (e) { return fail(e); } }
