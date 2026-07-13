import { useEffect, useState } from "react";
import { Info, Save, Sparkles } from "lucide-react";
import { CurrencyInput } from "../../../components/ui/currency-input";
import { FeatureTextarea } from "../../../components/ui/FeatureControls";
import { FeatureField } from "../../../components/ui/FeatureForms";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../../components/ui/FeatureStates";
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
      <FeatureSection
        className="flex flex-col gap-6"
        description="Descrição e preço abaixo são salvos no cadastro oficial do veículo."
        icon={<Sparkles aria-hidden="true" className="size-4 shrink-0" />}
        title="Configuração do anúncio"
      >
        {error ? <FeatureAlert>{error}</FeatureAlert> : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-2">
            <FeatureField label="Descrição">
              <FeatureTextarea
                aria-label="Descrição do anúncio"
                className="min-h-32 resize-y"
                disabled={savingField !== null}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva os destaques comerciais do veículo..."
                value={description}
              />
            </FeatureField>
            <FeatureActionButton
              className="justify-self-end"
              disabled={
                savingField !== null ||
                description.trim() === (listing.description ?? "")
              }
              icon={Save}
              isBusy={savingField === "description"}
              label="Salvar descrição"
              onClick={() => void saveDescription()}
              variant="primary"
            />
          </div>

          <div className="grid gap-2">
            <FeatureField
              hint={`Valor salvo: ${advertisedPrice}`}
              label="Valor do anúncio"
            >
              <CurrencyInput
                aria-label="Valor do anúncio"
                disabled={savingField !== null}
                id="inventory-ad-price"
                inputClassName="text-sm"
                onChange={setPrice}
                value={price}
              />
            </FeatureField>
            <FeatureActionButton
              disabled={
                savingField !== null ||
                price === toCurrencyValue(listing.priceCents)
              }
              icon={Save}
              isBusy={savingField === "price"}
              label="Salvar valor"
              onClick={() => void savePrice()}
              variant="primary"
            />
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
      </FeatureSection>

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
