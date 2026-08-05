import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    return NextResponse.json(await backendAuthenticatedRequest(`/purchasing/suppliers${query}`));
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível carregar os fornecedores." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      await backendAuthenticatedRequest("/purchasing/suppliers", {
        method: "POST",
        body: JSON.stringify(await request.json()),
      }),
    );
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível cadastrar o fornecedor." }, { status });
  }
}
