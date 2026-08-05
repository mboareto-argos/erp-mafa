import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";
export async function GET() { try { return NextResponse.json(await backendAuthenticatedRequest("/sales")); } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "Não foi possível carregar as vendas." }, { status: e instanceof ApiRequestError ? e.status : 502 }); } }
export async function POST(request: Request) { try { return NextResponse.json(await backendAuthenticatedRequest("/sales", { method: "POST", body: JSON.stringify(await request.json()) })); } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "Não foi possível criar a venda." }, { status: e instanceof ApiRequestError ? e.status : 502 }); } }
