import { BookOpen, PackageSearch } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionDialog } from "./CrmWhatsappActionDialogFrame";
import {
  FullCatalogFields,
  ProductPicker,
  filterProducts,
  mergeCatalogProducts,
} from "./CrmWhatsappCatalogDialogParts";
import type {
  CrmWhatsappCatalogProductsPage,
  CrmWhatsappListCatalogProductsInput,
  CrmWhatsappSendCatalogInput,
  CrmWhatsappSendCatalogProductInput,
} from "./crmWhatsappTypes";

export type CatalogDialogSend = (
  input: Omit<CrmWhatsappSendCatalogInput, "sessionId">,
) => Promise<boolean>;

export type CatalogProductDialogSend = (
  input: Omit<CrmWhatsappSendCatalogProductInput, "sessionId">,
) => Promise<boolean>;

export type CatalogProductLoader = (
  input?: Omit<CrmWhatsappListCatalogProductsInput, "sessionId">,
) => Promise<CrmWhatsappCatalogProductsPage | null>;

type CatalogMode = "catalog" | "product";

export function CatalogDialog({
  catalogUrl,
  disabled,
  onClose,
  onLoadProducts,
  onSend,
  onSendProduct,
}: {
  catalogUrl?: string | null | undefined;
  disabled?: boolean;
  onClose: () => void;
  onLoadProducts: CatalogProductLoader;
  onSend: CatalogDialogSend;
  onSendProduct: CatalogProductDialogSend;
}) {
  const [catalogPhone, setCatalogPhone] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message] = useState("Confira nosso catalogo de veiculos:");
  const [mode, setMode] = useState<CatalogMode>("product");
  const [page, setPage] = useState<CrmWhatsappCatalogProductsPage | null>(null);
  const [productId, setProductId] = useState("");
  const [query, setQuery] = useState("");
  const [title] = useState("Catalogo da loja");
  const [url] = useState(catalogUrl ?? "");
  const loadProductsRef = useRef(onLoadProducts);
  const products = useMemo(
    () => filterProducts(page?.products ?? [], query),
    [page?.products, query],
  );
  const selectedProduct = products.find((product) => product.id === productId);
  const isProductMode = mode === "product";
  const isDisabled =
    disabled ||
    isSaving ||
    (isProductMode && (!productId || isLoadingProducts));

  useEffect(() => {
    loadProductsRef.current = onLoadProducts;
  }, [onLoadProducts]);

  useEffect(() => {
    let active = true;
    setIsLoadingProducts(true);
    setLoadError(null);
    void loadProductsRef
      .current()
      .then((nextPage) => {
        if (!active) return;
        if (!nextPage) {
          setLoadError("Nao foi possivel carregar o catalogo do WhatsApp.");
          return;
        }
        setPage(nextPage);
        setCatalogPhone(nextPage.catalogPhone);
        setProductId(nextPage.products[0]?.id ?? "");
        setMode(nextPage.products.length ? "product" : "catalog");
      })
      .catch(() => {
        if (active)
          setLoadError("Nao foi possivel carregar o catalogo do WhatsApp.");
      })
      .finally(() => {
        if (active) setIsLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadMoreProducts = async () => {
    if (!page?.nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = await onLoadProducts({
        ...(catalogPhone ? { catalogPhone } : {}),
        nextCursor: page.nextCursor,
      });
      if (!nextPage) return;
      setPage({
        ...nextPage,
        products: mergeCatalogProducts(page.products, nextPage.products),
      });
      if (nextPage.catalogPhone) setCatalogPhone(nextPage.catalogPhone);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <ActionDialog
      disabled={isDisabled}
      icon={isProductMode ? <PackageSearch /> : <BookOpen />}
      onClose={onClose}
      onSubmit={async () => {
        setIsSaving(true);
        try {
          const accepted = isProductMode
            ? await onSendProduct({
                ...(catalogPhone.trim()
                  ? { catalogPhone: catalogPhone.trim() }
                  : {}),
                productId,
                ...(selectedProduct?.name
                  ? { productName: selectedProduct.name }
                  : {}),
              })
            : await onSend({
                ...(catalogPhone.trim()
                  ? { catalogPhone: catalogPhone.trim() }
                  : {}),
                ...(url.trim() ? { catalogUrl: url.trim() } : {}),
                ...(message.trim() ? { message: message.trim() } : {}),
                ...(title.trim() ? { title: title.trim() } : {}),
              });
          if (accepted) onClose();
        } finally {
          setIsSaving(false);
        }
      }}
      title="Catalogo WhatsApp"
    >
      <div className="crm-whatsapp-action-segmented" role="tablist">
        <button
          aria-selected={mode === "product"}
          onClick={() => setMode("product")}
          role="tab"
          type="button"
        >
          Produto
        </button>
        <button
          aria-selected={mode === "catalog"}
          onClick={() => setMode("catalog")}
          role="tab"
          type="button"
        >
          Catalogo completo
        </button>
      </div>

      {isProductMode ? (
        <ProductPicker
          disabled={disabled || isSaving}
          hasMore={Boolean(page?.nextCursor)}
          isLoading={isLoadingProducts}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMoreProducts}
          onQueryChange={setQuery}
          onSelect={setProductId}
          products={products}
          query={query}
          selectedId={productId}
          error={loadError}
        />
      ) : (
        <FullCatalogFields message={message} title={title} url={url} />
      )}
    </ActionDialog>
  );
}
