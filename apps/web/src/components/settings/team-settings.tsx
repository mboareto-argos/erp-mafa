"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/select-field";

type RoleName = "owner" | "admin" | "sales" | "inventory" | "finance" | "viewer";
type Membership = { id: string; status: "active" | "invited" | "removed"; user: { id: string; name: string; email: string; status: string }; role: { name: RoleName } };
type Invitation = { id: string; email: string; token: string; expiresAt: string; role: { name: RoleName } };
type Role = { id: string; name: RoleName };
const labels: Record<RoleName, string> = { owner: "Proprietário", admin: "Administrador", sales: "Vendedor", inventory: "Estoquista", finance: "Financeiro", viewer: "Visualizador" };

export function TeamSettings({ initialMemberships, initialInvitations, roles, currentUserId, currentRole }: { initialMemberships: Membership[]; initialInvitations: Invitation[]; roles: Role[]; currentUserId: string; currentRole: string }) {
  const [memberships, setMemberships] = useState(initialMemberships); const [invitations, setInvitations] = useState(initialInvitations); const [error, setError] = useState<string>(); const [message, setMessage] = useState<string>(); const [pending, setPending] = useState(false);
  const availableRoles = roles.filter(role => currentRole === "owner" || role.name !== "owner");

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true); setError(undefined); setMessage(undefined);
    try { const response = await fetch("/api/settings/users/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), roleName: data.get("roleName") }) }); const payload = await response.json() as { message?: string; type?: string; invitation?: Invitation & { roleName: RoleName }; membership?: Membership }; if (!response.ok) throw new Error(payload.message ?? "Não foi possível convidar."); const shouldReload = payload.type !== "invitation" || !payload.invitation; if (payload.type === "invitation" && payload.invitation) { setInvitations(current => [{ ...payload.invitation!, role: { name: payload.invitation!.roleName } }, ...current]); const link = `${window.location.origin}/convite/${payload.invitation.token}`; await navigator.clipboard?.writeText(link).catch(() => undefined); setMessage(`Convite criado. Link copiado: ${link}`); } else { setMessage("Usuário existente adicionado à empresa."); } form.reset(); if (shouldReload) window.location.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível convidar."); }
    finally { setPending(false); }
  }

  async function update(membership: Membership, roleName: RoleName, status: "active" | "removed") {
    setPending(true); setError(undefined); setMessage(undefined);
    try { const response = await fetch(`/api/settings/users/${membership.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleName, status }) }); const payload = await response.json() as { message?: string }; if (!response.ok) throw new Error(payload.message ?? "Não foi possível alterar o acesso."); setMemberships(current => current.map(item => item.id === membership.id ? { ...item, role: { name: roleName }, status } : item)); setMessage(status === "removed" ? "Acesso removido com histórico preservado." : "Perfil atualizado. As sessões anteriores foram revogadas."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível alterar o acesso."); }
    finally { setPending(false); }
  }

  return <div className="settings-team-layout"><section className="data-card"><div className="data-card-heading"><div><h2>Pessoas com acesso</h2><p>Perfis definem quais áreas e dados cada pessoa pode usar.</p></div><span className="settings-count">{memberships.filter(item => item.status === "active").length}</span></div><div className="settings-member-list">{memberships.map(member => <div className="settings-member" key={member.id}><span className="user-avatar">{member.user.name.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase()}</span><div><strong>{member.user.name}{member.user.id === currentUserId ? " (você)" : ""}</strong><small>{member.user.email} · {member.status === "active" ? "Acesso ativo" : "Acesso removido"}</small></div><select aria-label={`Perfil de ${member.user.name}`} value={member.role.name} disabled={pending || member.status !== "active" || (member.role.name === "owner" && currentRole !== "owner")} onChange={event => update(member, event.target.value as RoleName, "active")}>{availableRoles.map(role => <option key={role.id} value={role.name}>{labels[role.name]}</option>)}</select>{member.user.id !== currentUserId && member.status === "active" && (member.role.name !== "owner" || currentRole === "owner") ? <button className="button button-danger compact-button" type="button" disabled={pending} onClick={() => update(member, member.role.name, "removed")}>Remover</button> : <span />}</div>)}</div></section>
    <aside className="data-card settings-invite-card"><div className="data-card-heading"><div><h2>Convidar pessoa</h2><p>O link fica válido por sete dias.</p></div></div><form onSubmit={invite}><div className="field"><label htmlFor="invite-email">E-mail</label><input id="invite-email" name="email" type="email" required placeholder="pessoa@empresa.com" /></div><SelectField label="Perfil inicial" name="roleName" defaultValue="sales">{availableRoles.map(role => <option key={role.id} value={role.name}>{labels[role.name]}</option>)}</SelectField><button className="button button-primary" disabled={pending}>{pending ? "Criando convite…" : "Criar convite"}</button></form>{invitations.length > 0 && <div className="settings-pending-invites"><strong>Convites pendentes</strong>{invitations.map(invitation => <div key={invitation.id}><span>{invitation.email}</span><small>{labels[invitation.role.name]}</small><button type="button" className="text-link" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/convite/${invitation.token}`)}>Copiar link</button></div>)}</div>}{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}</aside>
  </div>;
}
