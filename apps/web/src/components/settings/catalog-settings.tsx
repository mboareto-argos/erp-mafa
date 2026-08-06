"use client";

import { useState } from "react";
import { AppIcon } from "@/components/layout/app-icon";

export type CatalogSetting = { id: string; name: string; status: "active" | "inactive" };

function CatalogGroup({ title, description, resource, initialItems, canManage }: { title: string; description: string; resource: "categories" | "brands"; initialItems: CatalogSetting[]; canManage: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string>();
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function call(path: string, method: "POST" | "PATCH", body?: object) {
    setPending(true); setError(undefined);
    try {
      const response = await fetch(`/api/settings/catalog/${resource}${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
      const payload = await response.json() as CatalogSetting & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Não foi possível salvar.");
      setItems(current => current.some(item => item.id === payload.id) ? current.map(item => item.id === payload.id ? payload : item) : [...current, payload].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar."); return false; }
    finally { setPending(false); }
  }

  async function create(event: React.FormEvent) { event.preventDefault(); if (await call("", "POST", { name })) setName(""); }
  async function save(id: string) { if (await call(`/${id}`, "PATCH", { name: editName })) setEditing(undefined); }
  async function toggle(item: CatalogSetting) { await call(`/${item.id}/${item.status === "active" ? "deactivate" : "reactivate"}`, "PATCH"); }

  return <section className="data-card settings-catalog-card">
    <div className="data-card-heading"><div><h2>{title}</h2><p>{description}</p></div><span className="settings-count">{items.length}</span></div>
    {canManage && <form className="settings-inline-create" onSubmit={create}><div className="field"><label htmlFor={`${resource}-name`}>Novo nome</label><input id={`${resource}-name`} value={name} onChange={event => setName(event.target.value)} required maxLength={120} placeholder={`Adicionar ${title.toLowerCase().slice(0, -1)}`} /></div><button className="button button-primary compact-button" disabled={pending}><AppIcon name="plus" /> Adicionar</button></form>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="settings-entity-list">{items.length === 0 ? <p className="inline-empty">Nenhum item cadastrado.</p> : items.map(item => <div key={item.id} className="settings-entity-row">
      {editing === item.id ? <input aria-label={`Editar ${item.name}`} value={editName} onChange={event => setEditName(event.target.value)} autoFocus /> : <div><strong>{item.name}</strong><small>{item.status === "active" ? "Ativa" : "Inativa"}</small></div>}
      {canManage && <div className="settings-row-actions">{editing === item.id ? <><button className="button button-primary compact-button" type="button" onClick={() => save(item.id)} disabled={pending}>Salvar</button><button className="button button-ghost compact-button" type="button" onClick={() => setEditing(undefined)}>Cancelar</button></> : <><button className="icon-button" type="button" aria-label={`Editar ${item.name}`} onClick={() => { setEditing(item.id); setEditName(item.name); }}><AppIcon name="edit" /></button><button className={`button compact-button ${item.status === "active" ? "button-secondary" : "button-primary"}`} type="button" onClick={() => toggle(item)} disabled={pending}>{item.status === "active" ? "Inativar" : "Reativar"}</button></>}</div>}
    </div>)}</div>
  </section>;
}

export function CatalogSettings({ categories, brands, canManage }: { categories: CatalogSetting[]; brands: CatalogSetting[]; canManage: boolean }) {
  return <div className="settings-two-columns"><CatalogGroup title="Categorias" description="Organize o catálogo e os filtros dos relatórios." resource="categories" initialItems={categories} canManage={canManage} /><CatalogGroup title="Marcas" description="Padronize fabricantes e marcas comerciais." resource="brands" initialItems={brands} canManage={canManage} /></div>;
}
