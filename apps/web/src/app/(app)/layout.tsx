import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/layout/app-navigation";
import { SessionRefresh } from "@/components/session/session-refresh";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession() as { user: { name: string }; company: { name: string }; permissions: string[] } | null;
  if (!session) redirect("/entrar");
  const initials = session.user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="app-shell"><SessionRefresh /><AppNavigation permissions={session.permissions} /><div className="main-area"><header className="topbar"><div className="company-chip"><span className="company-dot">M</span>{session.company.name}</div><div className="user-chip"><span className="avatar">{initials}</span>{session.user.name}</div></header>{children}</div></div>;
}
