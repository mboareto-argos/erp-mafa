"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ListingEmptyState, ListingTable } from "@/components/listings/listing-ui";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  document?: string | null;
  contactName?: string | null;
  instagram?: string | null;
  birthDate?: string | null;
  status: "active" | "inactive";
};

type Kind = "cliente" | "fornecedor";

function endpointFor(kind: Kind) {
  return kind === "cliente" ? "/api/customers" : "/api/purchasing/suppliers";
}

function ContactRow({ kind, contact, canManage }: { kind: Kind; contact: Contact; canManage: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const endpoint = endpointFor(kind);

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`${endpoint}/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          whatsapp: formData.get("whatsapp") || undefined,
          phone: formData.get("phone") || undefined,
          email: formData.get("email") || undefined,
          ...(kind === "cliente"
            ? {
                instagram: formData.get("instagram") || undefined,
                birthDate: formData.get("birthDate") || undefined,
              }
            : {
                document: formData.get("document") || undefined,
                contactName: formData.get("contactName") || undefined,
              }),
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível salvar.");
      setEditOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  async function toggleStatus() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`${endpoint}/${contact.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: contact.status === "active" ? "deactivate" : "activate" }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível atualizar o status.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o status.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="contact-directory">
      <tr>
        <td data-label="Nome">
          <strong>{contact.name}</strong>
        </td>
        <td data-label="WhatsApp">{contact.whatsapp || contact.phone || "—"}</td>
        <td data-label="E-mail">{contact.email || "—"}</td>
        <td data-label="Status">
          <span className={`status-badge ${contact.status}`}>
            {contact.status === "active" ? "Ativo" : "Inativo"}
          </span>
        </td>
        {canManage && (
          <td data-label="Ações">
            <div className="table-actions">
              <button
                type="button"
                className="button button-secondary compact-button"
                onClick={() => setEditOpen((current) => !current)}
              >
                Editar
              </button>
              <button
                type="button"
                className="button button-secondary compact-button"
                onClick={toggleStatus}
                disabled={pending}
              >
                {contact.status === "active" ? "Desativar" : "Reativar"}
              </button>
            </div>
          </td>
        )}
      </tr>
      {editOpen && (
        <tr>
          <td colSpan={5}>
            <form className="settlement-form table-edit-form" onSubmit={submitEdit} noValidate>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor={`edit-name-${contact.id}`}>Nome</label>
                  <input id={`edit-name-${contact.id}`} name="name" defaultValue={contact.name} required />
                </div>
                <div className="field">
                  <label htmlFor={`edit-whatsapp-${contact.id}`}>WhatsApp</label>
                  <input id={`edit-whatsapp-${contact.id}`} name="whatsapp" defaultValue={contact.whatsapp ?? ""} inputMode="tel" />
                </div>
                <div className="field">
                  <label htmlFor={`edit-phone-${contact.id}`}>Telefone</label>
                  <input id={`edit-phone-${contact.id}`} name="phone" defaultValue={contact.phone ?? ""} inputMode="tel" />
                </div>
                <div className="field">
                  <label htmlFor={`edit-email-${contact.id}`}>E-mail</label>
                  <input id={`edit-email-${contact.id}`} name="email" type="email" defaultValue={contact.email ?? ""} />
                </div>
                {kind === "cliente" ? (
                  <>
                    <div className="field">
                      <label htmlFor={`edit-instagram-${contact.id}`}>Instagram</label>
                      <input id={`edit-instagram-${contact.id}`} name="instagram" defaultValue={contact.instagram ?? ""} />
                    </div>
                    <div className="field">
                      <label htmlFor={`edit-birth-date-${contact.id}`}>Data de nascimento</label>
                      <input id={`edit-birth-date-${contact.id}`} name="birthDate" type="date" defaultValue={contact.birthDate?.slice(0, 10) ?? ""} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="field">
                      <label htmlFor={`edit-document-${contact.id}`}>Documento</label>
                      <input id={`edit-document-${contact.id}`} name="document" defaultValue={contact.document ?? ""} maxLength={32} />
                    </div>
                    <div className="field">
                      <label htmlFor={`edit-contact-name-${contact.id}`}>Pessoa de contato</label>
                      <input id={`edit-contact-name-${contact.id}`} name="contactName" defaultValue={contact.contactName ?? ""} maxLength={160} />
                    </div>
                  </>
                )}
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary compact-button" type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar edição"}
              </button>
            </form>
          </td>
        </tr>
      )}
    </section>
  );
}

export function ContactDirectory({
  kind,
  contacts,
  canManage,
  initialOpen = false,
}: {
  kind: Kind;
  contacts: Contact[];
  canManage: boolean;
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const endpoint = endpointFor(kind);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email") || undefined,
          phone: formData.get("phone") || undefined,
          whatsapp: formData.get("whatsapp") || undefined,
          ...(kind === "cliente"
            ? {
                instagram: formData.get("instagram") || undefined,
                birthDate: formData.get("birthDate") || undefined,
              }
            : {
                document: formData.get("document") || undefined,
                contactName: formData.get("contactName") || undefined,
              }),
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível salvar.");
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {canManage && !open && contacts.length > 0 && (
        <div className="directory-toolbar"><button className="button button-primary compact-button" onClick={() => setOpen(true)}>
          Novo {kind}
        </button></div>
      )}
      {canManage && open && (
        <section className="form-card">
          <div className="form-card-heading">
            <div>
              <h2>Novo {kind}</h2>
              <p>Preencha só o necessário para começar.</p>
            </div>
            <button className="close-button" onClick={() => setOpen(false)} aria-label="Fechar">
              ×
            </button>
          </div>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="field">
                <label>
                  Nome
                  <input name="name" required />
                </label>
              </div>
              <div className="field">
                <label>
                  WhatsApp
                  <input name="whatsapp" inputMode="tel" />
                </label>
              </div>
              <div className="field">
                <label>
                  Telefone
                  <input name="phone" inputMode="tel" />
                </label>
              </div>
              <div className="field">
                <label>
                  E-mail
                  <input name="email" type="email" />
                </label>
              </div>
              {kind === "cliente" ? (
                <>
                  <div className="field">
                    <label>
                      Instagram
                      <input name="instagram" />
                    </label>
                  </div>
                  <div className="field">
                    <label>
                      Data de nascimento
                      <input name="birthDate" type="date" />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label>
                      Documento
                      <input name="document" maxLength={32} />
                    </label>
                  </div>
                  <div className="field">
                    <label>
                      Pessoa de contato
                      <input name="contactName" maxLength={160} />
                    </label>
                  </div>
                </>
              )}
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary compact-button" disabled={pending}>
              {pending ? "Salvando…" : `Salvar ${kind}`}
            </button>
          </form>
        </section>
      )}
      {contacts.length === 0 ? (
        <ListingEmptyState
          title={`Nenhum ${kind} encontrado`}
          description="Cadastre agora para usar nos próximos atendimentos e operações."
          action={canManage && !open ? <button className="button button-primary compact-button" type="button" onClick={() => setOpen(true)}>Novo {kind}</button> : undefined}
        />
      ) : (
        <ListingTable headers={<><th>Nome</th><th>WhatsApp</th><th>E-mail</th><th>Status</th>{canManage && <th>Ações</th>}</>}>
          {contacts.map((contact) => <ContactRow key={contact.id} kind={kind} contact={contact} canManage={canManage} />)}
        </ListingTable>
      )}
    </>
  );
}
