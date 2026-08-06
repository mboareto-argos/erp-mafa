"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/layout/app-icon";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ListingTable } from "@/components/listings/listing-ui";

export type CustomerListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  birthDate: string | null;
  status: "active" | "inactive";
};

type CustomerDetail = CustomerListItem & {
  summary: {
    salesCount: number;
    totalPurchased: string;
    averageTicket: string;
    lastPurchaseAt: string | null;
    productsPurchased: number;
    outstandingBalance: string;
  };
  recentSales: Array<{
    id: string;
    status: "draft" | "confirmed" | "cancelled" | "partially_returned" | "returned";
    total: string;
    createdAt: string;
    _count: { items: number };
  }>;
};

const money = (value: string | number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
const civilDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(value));
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const saleStatus: Record<CustomerDetail["recentSales"][number]["status"], string> = { draft: "Rascunho", confirmed: "Confirmada", cancelled: "Cancelada", partially_returned: "Devolução parcial", returned: "Devolvida" };

function DuplicateNotice({ message }: { message: string }) {
  return <div className="customer-duplicate-notice" role="alert"><AppIcon name="customers" /><div><strong>Possível cliente duplicado</strong><p>{message} Você pode revisar os dados ou salvar mesmo assim.</p></div></div>;
}

function CustomerForm({ customer, customers, initialOpen, onClose }: { customer?: CustomerListItem; customers: CustomerListItem[]; initialOpen?: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [duplicateWarning, setDuplicateWarning] = useState<string>();
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);

  function findDuplicate(formData: FormData) {
    const email = formData.get("email")?.toString().trim().toLowerCase();
    const phones = [formData.get("whatsapp"), formData.get("phone")].map(value => value?.toString().replace(/\D/g, "")).filter(Boolean);
    const duplicate = customers.find(candidate => {
      if (candidate.id === customer?.id) return false;
      const candidatePhones = [candidate.whatsapp, candidate.phone].map(value => value?.replace(/\D/g, "")).filter(Boolean);
      return Boolean(email && candidate.email?.trim().toLowerCase() === email) || phones.some(phone => candidatePhones.includes(phone));
    });
    return duplicate ? `Já existe um cadastro chamado “${duplicate.name}” com o mesmo e-mail ou telefone.` : undefined;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const duplicate = findDuplicate(formData);
    if (duplicate && !duplicateAcknowledged) {
      setDuplicateWarning(duplicate);
      setDuplicateAcknowledged(true);
      return;
    }

    setPending(true);
    setError(undefined);
    try {
      const optional = (name: string) => formData.get(name)?.toString().trim() || null;
      const response = await fetch(customer ? `/api/customers/${customer.id}` : "/api/customers", {
        method: customer ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name")?.toString().trim(),
          whatsapp: optional("whatsapp"),
          phone: optional("phone"),
          email: optional("email"),
          instagram: optional("instagram"),
          birthDate: optional("birthDate"),
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? `Não foi possível ${customer ? "editar" : "cadastrar"} o cliente.`);
      onClose();
      if (initialOpen) router.replace("/clientes");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o cliente.");
    } finally {
      setPending(false);
    }
  }

  return <section className="form-card customer-workspace-form">
    <header className="form-card-heading">
      <div><span className="wizard-eyebrow">Relacionamento</span><h2>{customer ? `Editar cliente · ${customer.name}` : "Novo cliente"}</h2><p>Organize os dados essenciais para identificar e atender o cliente com agilidade.</p></div>
      <button className="close-button" type="button" aria-label="Fechar cadastro" onClick={onClose}>×</button>
    </header>
    <form onSubmit={submit} onInput={() => { setDuplicateWarning(undefined); setDuplicateAcknowledged(false); }} noValidate>
      <section className="wizard-form-section"><h3>Identificação</h3><div className="form-grid"><div className="field"><label htmlFor="customer-name">Nome do cliente</label><input id="customer-name" name="name" defaultValue={customer?.name} required maxLength={160} autoFocus /></div><div className="field"><label htmlFor="customer-birth-date">Data de nascimento <small>(opcional)</small></label><input id="customer-birth-date" name="birthDate" type="date" defaultValue={customer?.birthDate?.slice(0, 10) ?? ""} /></div></div></section>
      <section className="wizard-form-section"><h3>Contatos</h3><div className="form-grid customer-contact-grid"><div className="field"><label htmlFor="customer-whatsapp">WhatsApp <small>(opcional)</small></label><input id="customer-whatsapp" name="whatsapp" defaultValue={customer?.whatsapp ?? ""} inputMode="tel" autoComplete="tel" maxLength={32} placeholder="(11) 99999-9999" /></div><div className="field"><label htmlFor="customer-phone">Telefone <small>(opcional)</small></label><input id="customer-phone" name="phone" defaultValue={customer?.phone ?? ""} inputMode="tel" autoComplete="tel" maxLength={32} placeholder="(11) 3333-3333" /></div><div className="field"><label htmlFor="customer-email">E-mail <small>(opcional)</small></label><input id="customer-email" name="email" type="email" defaultValue={customer?.email ?? ""} autoComplete="email" maxLength={254} placeholder="cliente@exemplo.com" /></div><div className="field"><label htmlFor="customer-instagram">Instagram <small>(opcional)</small></label><input id="customer-instagram" name="instagram" defaultValue={customer?.instagram ?? ""} maxLength={64} placeholder="@usuario" /></div></div></section>
      <div className="customer-privacy-note"><AppIcon name="shield" /><p>Use apenas dados necessários para o relacionamento comercial e respeite o consentimento do cliente.</p></div>
      {duplicateWarning && <DuplicateNotice message={duplicateWarning} />}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary compact-button" type="submit" disabled={pending}>{pending ? "Salvando…" : duplicateWarning ? "Salvar mesmo assim" : customer ? "Salvar alterações" : "Cadastrar cliente"}</button></div>
    </form>
  </section>;
}

function CustomerDetails({ customer, open, onOpenChange }: { customer: CustomerListItem; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [detail, setDetail] = useState<CustomerDetail>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open || detail || error) return;
    let active = true;
    fetch(`/api/customers/${customer.id}`)
      .then(async response => {
        const result = (await response.json()) as CustomerDetail & { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível carregar a ficha do cliente.");
        if (active) setDetail(result);
      })
      .catch(caught => { if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar a ficha do cliente."); })
    return () => { active = false; };
  }, [customer.id, detail, error, open]);

  const summary = detail?.summary;
  const loading = open && !detail && !error;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sale-detail-dialog customer-detail-dialog">
    <header className="sale-detail-header"><div className="sale-detail-title"><span className="sale-detail-icon"><AppIcon name="customers" /></span><div><span className="sale-detail-eyebrow">Ficha do cliente</span><DialogTitle>{customer.name}</DialogTitle><DialogDescription>{customer.email || customer.whatsapp || customer.phone || "Cliente sem contato informado"}</DialogDescription></div></div><div className="sale-detail-header-actions"><span className={`status-badge ${customer.status}`}>{customer.status === "active" ? "Ativo" : "Inativo"}</span><DialogClose className="dialog-close" aria-label="Fechar">×</DialogClose></div></header>
    <div className="sale-detail-layout"><div className="sale-detail-main">
      <section className="sale-detail-card customer-contact-summary"><div><span>WhatsApp</span><strong>{customer.whatsapp || "Não informado"}</strong></div><div><span>Telefone</span><strong>{customer.phone || "Não informado"}</strong></div><div><span>E-mail</span><strong>{customer.email || "Não informado"}</strong></div><div><span>Instagram</span><strong>{customer.instagram || "Não informado"}</strong></div></section>
      <section className="sale-detail-card sale-detail-section"><div className="sale-detail-section-heading"><div><span className="sale-detail-section-icon"><AppIcon name="sales" /></span><div><h3>Histórico recente</h3><p>Últimas vendas vinculadas a este cadastro.</p></div></div>{detail && <strong>{detail.recentSales.length}</strong>}</div>{loading ? <div className="sale-detail-empty"><span>…</span><p>Carregando relacionamento do cliente…</p></div> : error ? <div className="sale-detail-empty"><span>!</span><p>{error} <button className="button-link text-link" type="button" onClick={() => setError(undefined)}>Tentar novamente</button></p></div> : detail?.recentSales.length ? <div className="table-wrap"><table><thead><tr><th>Venda</th><th>Data</th><th>Status</th><th className="number">Itens</th><th className="number">Total</th></tr></thead><tbody>{detail.recentSales.map(sale => <tr key={sale.id}><td data-label="Venda">#{sale.id.slice(0, 8).toUpperCase()}</td><td data-label="Data">{dateTime(sale.createdAt)}</td><td data-label="Status"><span className={`status-badge ${sale.status}`}>{saleStatus[sale.status]}</span></td><td className="number" data-label="Itens">{sale._count.items}</td><td className="number" data-label="Total">{money(sale.total)}</td></tr>)}</tbody></table></div> : <div className="sale-detail-empty"><span>—</span><p>Nenhuma venda vinculada a este cliente.</p></div>}</section>
      <section className="sale-detail-card customer-data-care"><AppIcon name="shield" /><div><h3>Proteção de dados</h3><p>Dados pessoais devem ser corrigidos ou removidos conforme a política aplicável, sem apagar o histórico operacional obrigatório.</p></div></section>
    </div><aside className="sale-financial-summary"><div className="sale-financial-heading"><span>Relacionamento</span><p>Indicadores calculados a partir das operações vinculadas.</p></div><dl><div><dt>Compras registradas</dt><dd>{summary?.salesCount ?? "—"}</dd></div><div><dt>Ticket médio</dt><dd>{summary ? money(summary.averageTicket) : "—"}</dd></div><div><dt>Produtos diferentes</dt><dd>{summary?.productsPurchased ?? "—"}</dd></div><div><dt>Última compra</dt><dd>{summary?.lastPurchaseAt ? date(summary.lastPurchaseAt) : "—"}</dd></div><div><dt>Saldo em aberto</dt><dd>{summary ? money(summary.outstandingBalance) : "—"}</dd></div></dl><div className="sale-financial-total"><span>Total comprado</span><strong>{summary ? money(summary.totalPurchased) : "—"}</strong></div><div className="sale-detail-state draft"><AppIcon name="shield" /><p>Os indicadores consideram somente registros da empresa atual e preservam o histórico após a inativação.</p></div></aside></div>
  </DialogContent></Dialog>;
}

function CustomerRow({ customer, canManage, onEdit }: { customer: CustomerListItem; canManage: boolean; onEdit: (customer: CustomerListItem) => void }) {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function changeStatus() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/customers/${customer.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: customer.status === "active" ? "deactivate" : "activate" }) });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível atualizar o status do cliente.");
      setStatusOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o status do cliente.");
    } finally {
      setPending(false);
    }
  }

  return <><tr><td data-label="Cliente"><strong>{customer.name}</strong>{customer.instagram && <small className="table-detail">{customer.instagram}</small>}</td><td data-label="Contato">{customer.whatsapp || customer.phone || "Não informado"}</td><td data-label="E-mail">{customer.email || "Não informado"}</td><td data-label="Nascimento">{customer.birthDate ? civilDate(customer.birthDate) : "—"}</td><td data-label="Status"><span className={`status-badge ${customer.status}`}>{customer.status === "active" ? "Ativo" : "Inativo"}</span></td><td className="table-actions-cell" data-label="Ações"><DropdownMenu><DropdownMenuTrigger asChild><button className="row-menu-trigger" type="button" aria-label={`Ações do cliente ${customer.name}`}><AppIcon name="more" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" sideOffset={6}><DropdownMenuItem className="dropdown-item view" onSelect={() => setDetailsOpen(true)}><span><AppIcon name="eye" /></span><div><strong>Visualizar</strong><small>Ver ficha e relacionamento</small></div></DropdownMenuItem>{canManage && <DropdownMenuItem className="dropdown-item edit" onSelect={() => onEdit(customer)}><span><AppIcon name="edit" /></span><div><strong>Editar cadastro</strong><small>Atualizar dados de contato</small></div></DropdownMenuItem>}{canManage && <DropdownMenuItem className={`dropdown-item ${customer.status === "active" ? "danger" : "success"}`} onSelect={() => setStatusOpen(true)}><span><AppIcon name={customer.status === "active" ? "cancel" : "shield"} /></span><div><strong>{customer.status === "active" ? "Inativar cliente" : "Reativar cliente"}</strong><small>{customer.status === "active" ? "Ocultar em novas operações" : "Disponibilizar novamente"}</small></div></DropdownMenuItem>}</DropdownMenuContent></DropdownMenu><CustomerDetails customer={customer} open={detailsOpen} onOpenChange={setDetailsOpen} />{canManage && <Dialog open={statusOpen} onOpenChange={setStatusOpen}><DialogContent><div className="dialog-heading"><div><DialogTitle>{customer.status === "active" ? "Inativar" : "Reativar"} cliente?</DialogTitle><DialogDescription>{customer.status === "active" ? "O cliente deixará de aparecer em novas vendas, mas seu histórico será preservado." : "O cliente voltará a ficar disponível para novas vendas."}</DialogDescription></div><DialogClose className="dialog-close" aria-label="Fechar">×</DialogClose></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><DialogClose asChild><button className="button button-secondary" type="button">Voltar</button></DialogClose><button className={`button ${customer.status === "active" ? "button-danger" : "button-primary compact-button"}`} type="button" disabled={pending} onClick={changeStatus}>{pending ? "Salvando…" : "Confirmar"}</button></div></DialogContent></Dialog>}</td></tr></>;
}

export function CustomerDirectory({ customers, canManage, initialOpen = false, query }: { customers: CustomerListItem[]; canManage: boolean; initialOpen?: boolean; query?: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(initialOpen);
  const [editing, setEditing] = useState<CustomerListItem>();
  const formOpen = creating || Boolean(editing);

  function closeForm() {
    setCreating(false);
    setEditing(undefined);
    if (initialOpen) router.replace("/clientes");
  }

  const rows = customers.length === 0 ? (
    <tr className="table-empty-row">
      <td className="table-empty-cell" colSpan={6}>
        <div className="table-empty-content">
          <span><AppIcon name="customers" /></span>
          <strong>{query ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}</strong>
          <p>{query ? "Tente outro termo ou limpe a busca para visualizar todos os clientes." : "Cadastre o primeiro cliente para começar a construir o histórico de relacionamento."}</p>
          {query ? <a className="button button-secondary compact-button" href="/clientes">Limpar busca</a> : canManage ? <button className="button button-primary compact-button" type="button" onClick={() => setCreating(true)}>Cadastrar primeiro cliente</button> : null}
        </div>
      </td>
    </tr>
  ) : customers.map(customer => <CustomerRow key={customer.id} customer={customer} canManage={canManage} onEdit={setEditing} />);

  return <section className="contact-directory customer-directory">
    {canManage && formOpen && <CustomerForm customer={editing} customers={customers} initialOpen={initialOpen} onClose={closeForm} />}
    {!formOpen && <ListingTable headers={<><th>Cliente</th><th>Contato</th><th>E-mail</th><th>Nascimento</th><th>Status</th><th className="table-actions-column">Ações</th></>}>{rows}</ListingTable>}
  </section>;
}
