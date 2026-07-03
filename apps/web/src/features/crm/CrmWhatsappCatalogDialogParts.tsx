import { BookOpen, Loader2, PackageSearch } from "lucide-react";
import type { CrmWhatsappCatalogProduct } from "./crmWhatsappTypes";

export function ProductPicker({
  disabled,
  error,
  hasMore,
  isLoading,
  isLoadingMore,
  onLoadMore,
  onQueryChange,
  onSelect,
  products,
  query,
  selectedId,
}: {
  disabled?: boolean;
  error?: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void>;
  onQueryChange: (value: string) => void;
  onSelect: (productId: string) => void;
  products: readonly CrmWhatsappCatalogProduct[];
  query: string;
  selectedId: string;
}) {
  return (
    <>
      <label>
        Buscar produto
        <input
          disabled={disabled || isLoading}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Nome, descricao ou codigo"
          value={query}
        />
      </label>
      {renderCatalogProducts({
        disabled,
        error,
        hasMore,
        isLoading,
        isLoadingMore,
        onLoadMore,
        onSelect,
        products,
        selectedId,
      })}
    </>
  );
}

export function FullCatalogFields({
  message,
  title,
  url,
}: {
  message: string;
  title: string;
  url: string;
}) {
  return (
    <section className="crm-whatsapp-catalog-preview">
      <span>
        <BookOpen aria-hidden="true" />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
        {url ? <small>{url}</small> : null}
      </div>
    </section>
  );
}

export function filterProducts(
  products: readonly CrmWhatsappCatalogProduct[],
  query: string,
) {
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  if (!needle) return products;
  return products.filter((product) =>
    [product.name, product.description, product.retailerId]
      .filter(Boolean)
      .some((value) =>
        String(value).toLocaleLowerCase("pt-BR").includes(needle),
      ),
  );
}

export function mergeCatalogProducts(
  current: readonly CrmWhatsappCatalogProduct[],
  next: readonly CrmWhatsappCatalogProduct[],
) {
  const seen = new Set(current.map((product) => product.id));
  return [
    ...current,
    ...next.filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    }),
  ];
}

function renderCatalogProducts(input: {
  disabled: boolean | undefined;
  error: string | null | undefined;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void>;
  onSelect: (productId: string) => void;
  products: readonly CrmWhatsappCatalogProduct[];
  selectedId: string;
}) {
  if (input.isLoading) {
    return (
      <div className="crm-whatsapp-catalog-loading">
        <Loader2 className="crm-spin" />
        Carregando catalogo
      </div>
    );
  }
  if (input.error)
    return <p className="crm-whatsapp-action-error">{input.error}</p>;
  return (
    <div className="crm-whatsapp-catalog-products">
      {input.products.map((product) => (
        <CatalogProductButton
          key={product.id}
          onSelect={input.onSelect}
          product={product}
          selected={product.id === input.selectedId}
        />
      ))}
      {!input.products.length ? (
        <p className="crm-whatsapp-action-error">
          Nenhum produto encontrado no catalogo.
        </p>
      ) : null}
      {input.hasMore ? (
        <button
          className="crm-whatsapp-catalog-load-more"
          disabled={input.disabled || input.isLoadingMore}
          onClick={() => void input.onLoadMore()}
          type="button"
        >
          {input.isLoadingMore ? "Carregando..." : "Carregar mais"}
        </button>
      ) : null}
    </div>
  );
}

function CatalogProductButton({
  onSelect,
  product,
  selected,
}: {
  onSelect: (productId: string) => void;
  product: CrmWhatsappCatalogProduct;
  selected: boolean;
}) {
  return (
    <button
      aria-label={`Enviar produto ${product.name}`}
      aria-pressed={selected}
      className="crm-whatsapp-catalog-product"
      onClick={() => onSelect(product.id)}
      type="button"
    >
      <span className="crm-whatsapp-catalog-thumb">
        {product.images[0] ? (
          <img alt="" src={product.images[0]} />
        ) : (
          <PackageSearch aria-hidden="true" />
        )}
      </span>
      <span className="crm-whatsapp-catalog-copy">
        <span>
          <strong>{product.name}</strong>
          {product.availability ? (
            <i>{formatAvailability(product.availability)}</i>
          ) : null}
        </span>
        {product.description ? <em>{product.description}</em> : null}
        <small>{formatProductMeta(product)}</small>
      </span>
    </button>
  );
}

function formatProductPrice(product: CrmWhatsappCatalogProduct) {
  const value = product.salePrice ?? product.price;
  if (!value) return "";
  return product.currency ? `${product.currency} ${value}` : value;
}

function formatProductMeta(product: CrmWhatsappCatalogProduct) {
  return (
    [
      formatProductPrice(product),
      product.quantity !== null && product.quantity !== undefined
        ? `${product.quantity} un.`
        : null,
      product.retailerId ? `Cod. ${product.retailerId}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Produto do catalogo"
  );
}

function formatAvailability(value: string) {
  const labels: Record<string, string> = {
    available: "Disponivel",
    in_stock: "Disponivel",
    out_of_stock: "Sem estoque",
    preorder: "Pre-venda",
  };
  return labels[value.toLocaleLowerCase("pt-BR")] ?? value;
}
