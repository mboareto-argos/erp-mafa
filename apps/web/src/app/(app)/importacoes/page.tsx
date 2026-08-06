import { ImportWorkspace } from "@/components/imports/import-workspace";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type ImportJob = { id: string; entityType: string; status: string; fileName: string | null; totalRows: number; createdCount: number; updatedCount: number; skippedCount: number; rejectedCount: number; createdAt: string };

export default async function ImportsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const session = await getSession() as { permissions: string[] } | null;
  if (!session?.permissions.includes("manage_imports")) return <main className="page-content"><section className="empty-card"><h1>Importações indisponíveis</h1><p>Seu perfil não possui acesso à migração de dados desta empresa.</p></section></main>;
  const query = await searchParams;
  const jobs = await backendAuthenticatedRequest("/imports") as ImportJob[];
  return <main className="page-content"><ImportWorkspace initialJobs={jobs} initialOpen={query.new === "import"} /></main>;
}
