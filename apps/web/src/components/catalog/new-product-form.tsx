'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SelectField } from '@/components/ui/select-field';

type Option = { id: string; name: string; status: string };
type EditableProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  minStock: string | null;
  categoryId?: string | null;
  brandId?: string | null;
};

export function NewProductForm({
  initialOpen = false,
  categories,
  brands,
  editingProduct,
}: {
  initialOpen?: boolean;
  categories: Option[];
  brands: Option[];
  editingProduct?: EditableProduct;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  function close() {
    setOpen(false);
    setError(undefined);
    if (initialOpen || editingProduct) router.replace('/produtos');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const minStockValue = formData.get('minStock')?.toString().trim();
    const salePriceValue = formData.get('salePrice')?.toString().trim();
    const categoryId = formData.get('categoryId')?.toString();
    const brandId = formData.get('brandId')?.toString();
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        editingProduct
          ? `/api/catalog/products/${editingProduct.id}`
          : '/api/catalog/products',
        {
          method: editingProduct ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: formData.get('sku'),
            name: formData.get('name'),
            unit: formData.get('unit'),
            ...(categoryId
              ? { categoryId }
              : editingProduct
                ? { categoryId: null }
                : {}),
            ...(brandId
              ? { brandId }
              : editingProduct
                ? { brandId: null }
                : {}),
            ...(minStockValue
              ? { minStock: Number(minStockValue.replace(',', '.')) }
              : editingProduct
                ? { minStock: null }
                : {}),
            ...(!editingProduct && salePriceValue
              ? { salePrice: Number(salePriceValue.replace(',', '.')) }
              : {}),
          }),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          result.message ??
            `Não foi possível ${editingProduct ? 'editar' : 'cadastrar'} o produto.`,
        );
      close();
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Não foi possível ${editingProduct ? 'editar' : 'cadastrar'} o produto.`,
      );
    } finally {
      setPending(false);
    }
  }

  if (!open)
    return (
      <button
        className="button button-primary compact-button"
        onClick={() => setOpen(true)}
      >
        Novo produto
      </button>
    );

  return (
    <section className="form-card product-workspace-form">
      <header className="form-card-heading">
        <div>
          <span className="wizard-eyebrow">Catálogo</span>
          <h2>
            {editingProduct
              ? `Editar produto · ${editingProduct.name}`
              : 'Novo produto'}
          </h2>
          <p>
            {editingProduct
              ? 'Atualize os dados cadastrais. Preço e custo possuem fluxos próprios para preservar o histórico.'
              : 'Cadastre as informações essenciais agora; o custo será calculado quando uma compra for recebida.'}
          </p>
        </div>
        <button
          className="close-button"
          type="button"
          aria-label="Fechar cadastro"
          onClick={close}
        >
          ×
        </button>
      </header>
      <form onSubmit={submit} noValidate>
        <section className="wizard-form-section">
          <h3>Identificação</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="product-name">Nome do produto</label>
              <input
                id="product-name"
                name="name"
                defaultValue={editingProduct?.name}
                required
                maxLength={160}
              />
            </div>
            <div className="field">
              <label htmlFor="product-sku">SKU</label>
              <input
                id="product-sku"
                name="sku"
                defaultValue={editingProduct?.sku}
                required
                maxLength={60}
              />
            </div>
          </div>
        </section>
        <section className="wizard-form-section">
          <h3>Organização e controle</h3>
          <div className="form-grid">
            <SelectField
              label="Categoria"
              name="categoryId"
              defaultValue={editingProduct?.categoryId ?? ''}
            >
              <option value="">Sem categoria</option>
              {categories
                .filter((option) => option.status === 'active')
                .map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.name}
                  </option>
                ))}
            </SelectField>
            <SelectField
              label="Marca"
              name="brandId"
              defaultValue={editingProduct?.brandId ?? ''}
            >
              <option value="">Sem marca</option>
              {brands
                .filter((option) => option.status === 'active')
                .map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.name}
                  </option>
                ))}
            </SelectField>
            <div className="field">
              <label htmlFor="product-unit">Unidade de medida</label>
              <input
                id="product-unit"
                name="unit"
                defaultValue={editingProduct?.unit ?? 'un'}
                required
                maxLength={20}
              />
            </div>
            <div className="field">
              <label htmlFor="product-min-stock">
                Estoque mínimo <small>(opcional)</small>
              </label>
              <input
                id="product-min-stock"
                name="minStock"
                defaultValue={editingProduct?.minStock ?? ''}
                inputMode="decimal"
              />
            </div>
          </div>
        </section>
        {!editingProduct && (
          <section className="wizard-form-section">
            <h3>Preço inicial</h3>
            <div className="form-grid">
              <CurrencyInput
                label="Preço de venda"
                name="salePrice"
                min={0}
                hint="Poderá ser alterado depois com motivo e histórico."
              />
              <div className="calculated-field">
                <span>Custo de referência</span>
                <strong>Calculado automaticamente</strong>
                <small>
                  Será formado pelos recebimentos de compras e seus custos
                  rateados.
                </small>
              </div>
            </div>
          </section>
        )}
        {editingProduct && (
          <p className="form-hint">
            Para alterar o preço de venda, use “Reprecificar” no menu de ações.
            O custo nunca é digitado diretamente.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={close}
          >
            Cancelar
          </button>
          <button
            className="button button-primary compact-button"
            type="submit"
            disabled={pending}
          >
            {pending
              ? 'Salvando…'
              : editingProduct
                ? 'Salvar alterações'
                : 'Cadastrar produto'}
          </button>
        </div>
      </form>
    </section>
  );
}
