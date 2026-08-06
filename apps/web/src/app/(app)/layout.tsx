import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/layout/app-navigation";
import { AppHeader } from "@/components/layout/app-header";
import { SessionRefresh } from "@/components/session/session-refresh";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession() as { user: { name: string }; company: { name: string }; roleName: string; permissions: string[] } | null;
  if (!session) redirect("/entrar");
  const initials = session.user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="app-shell"><SessionRefresh /><AppNavigation permissions={session.permissions} userName={session.user.name} roleName={session.roleName} /><div className="main-area"><AppHeader companyName={session.company.name} userName={session.user.name} initials={initials} permissions={session.permissions} />{children}</div></div>;
}
