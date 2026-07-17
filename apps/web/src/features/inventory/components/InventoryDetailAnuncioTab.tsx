import { useEffect, useState, type ReactNode } from "react";
import {
  AlignLeft,
  Check,
  ExternalLink,
  Hash,
  LoaderCircle,
  type LucideIcon,
  Megaphone,
  Save,
  Tag,
  Video,
} from "lucide-react";
import { CurrencyInput } from "../../../components/ui/currency-input";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../../components/ui/FeatureControls";
import { FeatureField } from "../../../components/ui/FeatureForms";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryListingDetail,
  UpdateInventoryListingInput,
} from "../model/types";
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
  const [commercialTags, setCommercialTags] = useState(
    listing.commercialTags.join(", "),
  );
  const [videoUrl, setVideoUrl] = useState(listing.videoUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedDescription = description.trim() || null;
  const nextPriceCents = toPriceCents(price);
  const nextCommercialTags = normalizeCommercialTags(commercialTags);
  const nextVideoUrl = videoUrl.trim() || null;
  const descriptionChanged =
    normalizedDescription !== (listing.description?.trim() || null);
  const priceChanged = nextPriceCents !== listing.priceCents;
  const tagsChanged =
    nextCommercialTags.join("\u0000") !== listing.commercialTags.join("\u0000");
  const videoChanged = nextVideoUrl !== listing.videoUrl;
  const hasChanges =
    descriptionChanged || priceChanged || tagsChanged || videoChanged;

  useEffect(() => {
    setDescription(listing.description ?? "");
    setPrice(toCurrencyValue(listing.priceCents));
    setCommercialTags(listing.commercialTags.join(", "));
    setVideoUrl(listing.videoUrl ?? "");
  }, [
    listing.commercialTags,
    listing.description,
    listing.priceCents,
    listing.videoUrl,
  ]);

  async function saveChanges() {
    if (!hasChanges) return;
    if (nextVideoUrl && !isHttpUrl(nextVideoUrl)) {
      setError(
        "Informe uma URL de vídeo válida começando com http:// ou https://.",
      );
      return;
    }
    const input: UpdateInventoryListingInput = {
      ...(tagsChanged ? { commercialTags: nextCommercialTags } : {}),
      ...(descriptionChanged ? { description: normalizedDescription } : {}),
      ...(priceChanged ? { priceCents: nextPriceCents } : {}),
      ...(videoChanged ? { videoUrl: nextVideoUrl } : {}),
    };
    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.updateListingDetails(listing.id, input);
      onUpdated(updated);
      setDescription(updated.listing.description ?? "");
      setPrice(toCurrencyValue(updated.listing.priceCents));
      setCommercialTags(updated.listing.commercialTags.join(", "));
      setVideoUrl(updated.listing.videoUrl ?? "");
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível salvar as alterações do anúncio.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-8 text-app-text">
      <FeatureSection
        className="flex flex-col gap-6"
        description={
          "Descrição, preço, tags e vídeo são salvos no anúncio oficial e aparecem na vitrine quando ele é publicado."
        }
        icon={
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Megaphone aria-hidden="true" className="size-4" />
          </span>
        }
        radius="xl"
        title="Configuração do anúncio"
      >
        {error ? <FeatureAlert>{error}</FeatureAlert> : null}

        <FeatureField
          hint={`${description.trim().length} caracteres`}
          label={<FieldLabel icon={AlignLeft}>Descrição</FieldLabel>}
        >
          <FeatureTextarea
            aria-label="Descrição do anúncio"
            className="min-h-36 resize-y disabled:text-muted disabled:opacity-100"
            disabled={isSaving}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descreva os destaques comerciais do veículo..."
            value={description}
          />
        </FeatureField>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FeatureField
            hint={`Valor salvo: ${advertisedPrice}`}
            label={<FieldLabel icon={Tag}>Valor do anúncio</FieldLabel>}
          >
            <CurrencyInput
              aria-label="Valor do anúncio"
              disabled={isSaving}
              id="inventory-ad-price"
              inputClassName="text-sm disabled:text-muted disabled:opacity-100"
              onChange={setPrice}
              value={price}
            />
          </FeatureField>

          <div className="grid content-start gap-2">
            <FeatureField
              hint="Aceita YouTube ou um arquivo de vídeo público."
              label={<FieldLabel icon={Video}>Vídeo do anúncio</FieldLabel>}
            >
              <FeatureInput
                aria-label="URL do vídeo do anúncio"
                className="disabled:text-muted disabled:opacity-100"
                disabled={isSaving}
                inputMode="url"
                maxLength={2048}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                type="url"
                value={videoUrl}
              />
            </FeatureField>
            {nextVideoUrl && isHttpUrl(nextVideoUrl) ? (
              <a
                className="inline-flex w-fit items-center gap-1 text-xs font-black text-accent-strong hover:underline"
                href={nextVideoUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" className="size-3" />
                Abrir vídeo em nova aba
              </a>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2.5">
          <FeatureField
            hint="Separe as tags por vírgulas. Máximo de 12 tags."
            label={<FieldLabel icon={Hash}>Tags comerciais</FieldLabel>}
          >
            <FeatureInput
              aria-label="Tags comerciais"
              className="disabled:text-muted disabled:opacity-100"
              disabled={isSaving}
              maxLength={500}
              onChange={(event) => setCommercialTags(event.target.value)}
              placeholder="Baixa quilometragem, Único dono, Revisado"
              value={commercialTags}
            />
          </FeatureField>
          {nextCommercialTags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {nextCommercialTags.map((tag) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-black text-accent-strong"
                  key={tag}
                >
                  <Hash aria-hidden="true" className="size-3" />
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-muted">
              As tags aparecerão aqui conforme você digita.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          {hasChanges ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-warning-strong">
              <span className="size-2 shrink-0 rounded-full bg-warning-strong" />
              Alterações não salvas
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted">
              <Check aria-hidden="true" className="size-3.5 text-emerald-500" />
              Anúncio sincronizado
            </span>
          )}
          <FeatureActionButton
            disabled={!hasChanges}
            icon={isSaving ? LoaderCircle : Save}
            isBusy={isSaving}
            label={isSaving ? "Salvando alterações" : "Salvar alterações"}
            onClick={() => void saveChanges()}
            variant="primary"
          />
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

function FieldLabel({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon aria-hidden="true" className="size-3.5 text-muted" />
      {children}
    </span>
  );
}

function toCurrencyValue(priceCents: number | null) {
  return priceCents === null ? "" : (priceCents / 100).toFixed(2);
}

function toPriceCents(value: string) {
  if (!value) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function normalizeCommercialTags(value: string): readonly string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().slice(0, 40))
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
