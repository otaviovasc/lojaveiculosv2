import { useEffect, useState } from "react";
import { Info, Save, Sparkles } from "lucide-react";
import { CurrencyInput } from "../../../components/ui/currency-input";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail } from "../model/types";
import { formatPrice } from "./InventoryDetailWorkspaceMocks";
import { InventoryDetailPortaisSection } from "./InventoryDetailPortaisSection";

type Props = {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
  publicListingUrl: string | null;
};

export function InventoryDetailAnuncioTab({
  api,
  detail,
  onUpdated,
  publicListingUrl,
}: Props) {
  const listing = detail.listing;
  const advertisedPrice =
    listing.priceCents !== null
      ? formatPrice(listing.priceCents)
      : "Sob consulta";
  const [description, setDescription] = useState(listing.description ?? "");
  const [price, setPrice] = useState(toCurrencyValue(listing.priceCents));
  const [savingField, setSavingField] = useState<
    "description" | "price" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDescription(listing.description ?? "");
    setPrice(toCurrencyValue(listing.priceCents));
  }, [listing.description, listing.priceCents]);

  async function saveDescription() {
    const normalized = description.trim() || null;
    setSavingField("description");
    setError(null);
    try {
      const updated = await api.updateListingDetails(listing.id, {
        description: normalized,
      });
      onUpdated(updated);
      setDescription(updated.listing.description ?? "");
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível salvar a descrição do anúncio.",
        ),
      );
    } finally {
      setSavingField(null);
    }
  }

  async function savePrice() {
    setSavingField("price");
    setError(null);
    try {
      const updated = await api.updateListingDetails(listing.id, {
        priceCents: price ? Math.round(Number(price) * 100) : null,
      });
      onUpdated(updated);
      setPrice(toCurrencyValue(updated.listing.priceCents));
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível salvar o valor do anúncio.",
        ),
      );
    } finally {
      setSavingField(null);
    }
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-8 text-app-text">
      <section className="flex flex-col gap-6 rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-col gap-2 border-b border-line pb-3">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <Sparkles className="size-4 shrink-0 text-accent" />
            <span>Configuração do anúncio</span>
          </h3>
          <p className="text-xs font-bold text-muted">
            Descrição e preço abaixo são salvos no cadastro oficial do veículo.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-xs font-bold text-danger">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <label className="flex flex-col gap-2 text-xs font-black uppercase tracking-wider text-muted">
            <span>Descrição</span>
            <textarea
              aria-label="Descrição do anúncio"
              className="min-h-32 w-full resize-y rounded-xl border border-line bg-app p-3 text-xs font-bold normal-case tracking-normal text-app-text outline-none focus:ring-1 focus:ring-accent"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descreva os destaques comerciais do veículo..."
              value={description}
            />
            <button
              className="inline-flex min-h-9 items-center justify-center gap-2 self-end rounded-lg bg-accent px-4 text-xs font-black normal-case tracking-normal text-inverse transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-55"
              disabled={
                savingField !== null ||
                description.trim() === (listing.description ?? "")
              }
              onClick={() => void saveDescription()}
              type="button"
            >
              <Save className="size-3.5" />
              <span>
                {savingField === "description"
                  ? "Salvando..."
                  : "Salvar descrição"}
              </span>
            </button>
          </label>

          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-black uppercase tracking-wider text-muted"
              htmlFor="inventory-ad-price"
            >
              Valor do anúncio
            </label>
            <CurrencyInput
              aria-label="Valor do anúncio"
              disabled={savingField !== null}
              id="inventory-ad-price"
              inputClassName="text-sm"
              onChange={setPrice}
              value={price}
            />
            <span className="text-xs font-bold text-muted">
              Valor salvo: {advertisedPrice}
            </span>
            <button
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-xs font-black text-inverse transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-55"
              disabled={
                savingField !== null ||
                price === toCurrencyValue(listing.priceCents)
              }
              onClick={() => void savePrice()}
              type="button"
            >
              <Save className="size-3.5" />
              <span>
                {savingField === "price" ? "Salvando..." : "Salvar valor"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 rounded-xl border border-line bg-app-elevated/40 p-3 text-xs font-bold text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <p>
            Tags comerciais e vídeo ainda não fazem parte do contrato persistido
            do anúncio. Esses campos permanecem indisponíveis até existir
            suporte no backend e na publicação pública.
          </p>
        </div>
      </section>

      <InventoryDetailPortaisSection
        advertisedPrice={advertisedPrice}
        publicListingUrl={publicListingUrl}
        title={listing.title}
      />
    </div>
  );
}

function toCurrencyValue(priceCents: number | null) {
  return priceCents === null ? "" : (priceCents / 100).toFixed(2);
}
