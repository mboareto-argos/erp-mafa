import { NextResponse } from "next/server";
import { ApiRequestError, backendRequest } from "@/lib/session";

type InvitationContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: InvitationContext) {
  try { return NextResponse.json(await backendRequest(`/invitations/${(await context.params).token}`)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Convite inválido." }, { status: error instanceof ApiRequestError ? error.status : 502 }); }
}

export async function POST(request: Request, context: InvitationContext) {
  try { return NextResponse.json(await backendRequest(`/invitations/${(await context.params).token}/accept`, { method: "POST", body: JSON.stringify(await request.json()) })); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível aceitar o convite." }, { status: error instanceof ApiRequestError ? error.status : 502 }); }
}
