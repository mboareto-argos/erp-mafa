import { NextResponse } from "next/server";
import { ApiRequestError, backendAuthenticatedRequest, readAccessToken } from "@/lib/session";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
const failure = (error: unknown) => NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível concluir a importação." }, { status: error instanceof ApiRequestError ? error.status : 502 });

export async function GET(request: Request, context: RouteContext<"/api/imports/[...path]">) {
  const { path } = await context.params;
  const target = path.join("/");
  try {
    if (!target.endsWith("/template")) return NextResponse.json(await backendAuthenticatedRequest(`/imports/${target}${new URL(request.url).search}`));
    const token = await readAccessToken();
    if (!token) return NextResponse.json({ message: "Sessão expirada. Faça login novamente." }, { status: 401 });
    const response = await fetch(`${apiBaseUrl}/imports/${target}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) throw new ApiRequestError(response.status, "Não foi possível baixar o modelo.");
    return new NextResponse(await response.text(), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": response.headers.get("Content-Disposition") ?? "attachment; filename=importacao.csv" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, context: RouteContext<"/api/imports/[...path]">) {
  const { path } = await context.params;
  const target = path.join("/");
  try {
    if (target.endsWith("/preview")) {
      const token = await readAccessToken();
      if (!token) return NextResponse.json({ message: "Sessão expirada. Faça login novamente." }, { status: 401 });
      const response = await fetch(`${apiBaseUrl}/imports/${target}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: await request.formData(), cache: "no-store" });
      const payload = await response.json();
      return NextResponse.json(payload, { status: response.status });
    }
    const key = request.headers.get("Idempotency-Key");
    return NextResponse.json(await backendAuthenticatedRequest(`/imports/${target}`, { method: "POST", body: JSON.stringify(await request.json()), headers: key ? { "Idempotency-Key": key } : undefined }));
  } catch (error) { return failure(error); }
}
