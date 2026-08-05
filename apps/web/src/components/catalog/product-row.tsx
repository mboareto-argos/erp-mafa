"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  status: "active" | "inactive";
  minStock: string | null;
  category: { name: string } | null;
  prices: Array<{ salePrice: string; costPrice: string }>;
};

const money = (value: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));

export function ProductRow({ product, canManage }: { product: Product; canManage: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [repriceOpen, setRepriceOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const minStockValue = formData.get("minStock")?.toString().trim();
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/catalog/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          sku: formData.get("sku"),
          unit: formData.get("unit"),
          ...(minStockValue ? { minStock: Number(minStockValue.replace(",", ".")) } : {}),
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível editar o produto.");
      setEditOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível editar o produto.");
    } finally {
      setPending(false);
    }
  }

  async function submitReprice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/catalog/products/${product.id}/reprice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salePrice: Number(formData.get("salePrice")?.toString().replace(",", ".")),
          reason: formData.get("reason"),
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível reprecificar o produto.");
      setRepriceOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível reprecificar o produto.");
    } finally {
      setPending(false);
    }
  }

  async function toggleStatus() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/catalog/products/${product.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: product.status === "active" ? "deactivate" : "activate" }),
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
    <>
      <tr>
        <td data-label="Produto">
          <strong>{product.name}</strong>
          <small className="table-detail">Unidade: {product.unit}</small>
        </td>
        <td data-label="SKU">{product.sku}</td>
        <td data-label="Categoria">{product.category?.name ?? "Sem categoria"}</td>
        <td className="number" data-label="Preço de venda">
          {product.prices[0] ? money(product.prices[0].salePrice) : "Ainda não informado"}
        </td>
        <td data-label="Status">
          <span className={`status-badge ${product.status}`}>
            {product.status === "active" ? "Ativo" : "Inativo"}
          </span>
        </td>
        {canManage && (
          <td data-label="Ações">
            <div className="page-actions">
              <button
                type="button"
                className="button button-secondary compact-button"
                onClick={() => {
                  setRepriceOpen(false);
                  setEditOpen((current) => !current);
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className="button button-secondary compact-button"
                onClick={() => {
                  setEditOpen(false);
                  setRepriceOpen((current) => !current);
                }}
              >
                Reprecificar
              </button>
              <button
                type="button"
                className="button button-secondary compact-button"
                onClick={toggleStatus}
                disabled={pending}
              >
                {product.status === "active" ? "Desativar" : "Reativar"}
              </button>
            </div>
          </td>
        )}
      </tr>
      {editOpen && (
        <tr>
          <td colSpan={6}>
            <form className="settlement-form" onSubmit={submitEdit} noValidate>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor={`edit-name-${product.id}`}>Nome do produto</label>
                  <input id={`edit-name-${product.id}`} name="name" defaultValue={product.name} required maxLength={160} />
                </div>
                <div className="field">
                  <label htmlFor={`edit-sku-${product.id}`}>SKU</label>
                  <input id={`edit-sku-${product.id}`} name="sku" defaultValue={product.sku} required maxLength={60} />
                </div>
                <div className="field">
                  <label htmlFor={`edit-unit-${product.id}`}>Unidade</label>
                  <input id={`edit-unit-${product.id}`} name="unit" defaultValue={product.unit} required maxLength={20} />
                </div>
                <div className="field">
                  <label htmlFor={`edit-min-stock-${product.id}`}>Estoque mínimo <small>(opcional)</small></label>
                  <input id={`edit-min-stock-${product.id}`} name="minStock" defaultValue={product.minStock ?? ""} inputMode="decimal" />
                </div>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary compact-button" type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar edição"}
              </button>
            </form>
          </td>
        </tr>
      )}
      {repriceOpen && (
        <tr>
          <td colSpan={6}>
            <form className="settlement-form" onSubmit={submitReprice} noValidate>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor={`reprice-sale-${product.id}`}>Novo preço de venda</label>
                  <input id={`reprice-sale-${product.id}`} name="salePrice" defaultValue={product.prices[0]?.salePrice} required inputMode="decimal" />
                </div>
                <div className="field">
                  <label htmlFor={`reprice-reason-${product.id}`}>Motivo</label>
                  <input id={`reprice-reason-${product.id}`} name="reason" required maxLength={500} />
                </div>
              </div>
              <p className="form-hint">O custo é calculado pelos recebimentos e não pode ser digitado aqui.</p>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary compact-button" type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar reprecificação"}
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
