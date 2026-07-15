import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Sparkles } from "lucide-react";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import {
  aiStudioTemplates,
  type AiStudioGenerationResult,
  type AiStudioTemplateId,
} from "../model/aiStudioTypes";
import {
  AiStudioBeforeAfter,
  AiStudioTemplateSelector,
} from "./AiStudioModalParts";
import { ControlSection } from "./ImageTemplateControlPrimitives";
import type {
  ImageTemplateListing,
  ImageTemplateMedia,
} from "./ImageTemplateTypes";
import {
  QuotaCard,
  SelectedPhotoCard,
  StatusMessage,
  type AiStudioStatus,
  type IndexedImageTemplateMedia,
} from "./ImageTemplateAiStudioSectionParts";
import { downloadAiStudioImage } from "./downloadAiStudioImage";
import { useAiStudioGenerationQuota } from "./useAiStudioGenerationQuota";

export function ImageTemplateAiStudioSection({
  activeSection,
  api,
  listing,
  media,
  primaryUnitId,
  selectedPhotoIndex,
  setActiveSection,
  setSelectedPhotoIndex,
}: {
  activeSection: string | null;
  api: InventoryApi | null;
  listing: ImageTemplateListing;
  media: readonly ImageTemplateMedia[];
  primaryUnitId?: string | null | undefined;
  selectedPhotoIndex: number;
  setActiveSection: (section: string | null) => void;
  setSelectedPhotoIndex: (index: number) => void;
}) {
  const photos = useMemo(
    () => media.map((item, index) => ({ ...item, index })).filter(isPhotoMedia),
    [media],
  );
  const selectedPhoto =
    photos.find((photo) => photo.id === media[selectedPhotoIndex]?.id) ??
    photos[0];
  const unitId = selectedPhoto?.unitId ?? primaryUnitId ?? null;
  const quota = useAiStudioGenerationQuota(listing.storeId ?? listing.tenantId);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<AiStudioTemplateId>("premium_studio");
  const [generation, setGeneration] = useState<AiStudioGenerationResult | null>(
    null,
  );
  const [status, setStatus] = useState<AiStudioStatus>({ kind: "idle" });

  useEffect(() => {
    setGeneration(null);
    setStatus({ kind: "idle" });
  }, [listing.title, selectedPhoto?.id]);

  const canGenerate =
    Boolean(api && selectedPhoto?.id && unitId) &&
    !quota.isExhausted &&
    status.kind !== "generating";
  const canDownload = Boolean(generation) && status.kind !== "downloading";

  const generate = async () => {
    if (!api || !selectedPhoto?.id || !unitId || quota.isExhausted) return;
    setStatus({ kind: "generating" });
    try {
      const result = await api.generateAiStudioImage(unitId, {
        mediaId: selectedPhoto.id,
        templateId: selectedTemplateId,
      });
      setGeneration(result);
      quota.recordGeneration();
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Nao foi possivel melhorar a foto com IA.",
        ),
      });
    }
  };

  const download = async () => {
    if (!generation) return;
    setStatus({ kind: "downloading" });
    await downloadAiStudioImage({
      imageUrl: generation.generatedUrl,
      listingTitle: listing.title,
      templateId: generation.templateId,
    });
    setStatus({ kind: "downloaded" });
  };

  return (
    <ControlSection
      active={activeSection === "ai-studio"}
      icon={<Sparkles className="size-4" />}
      onToggle={() =>
        setActiveSection(activeSection === "ai-studio" ? null : "ai-studio")
      }
      title="Melhorar foto com IA"
    >
      <div className="space-y-4 p-4 pt-0">
        <QuotaCard quota={quota} />
        <SelectedPhotoCard
          photos={photos}
          selectedPhoto={selectedPhoto}
          setSelectedPhotoIndex={setSelectedPhotoIndex}
        />
        <AiStudioTemplateSelector
          onSelect={setSelectedTemplateId}
          selectedTemplateId={selectedTemplateId}
          templates={aiStudioTemplates}
          variant="stack"
        />
        <StatusMessage exhausted={quota.isExhausted} status={status} />
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-black text-accent-foreground transition-colors hover:bg-accent-strong hover:text-accent-strong-foreground disabled:opacity-55"
            disabled={!canGenerate}
            onClick={() => void generate()}
            type="button"
          >
            {status.kind === "generating" ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Sparkles aria-hidden="true" className="size-4" />
            )}
            {generation ? "Gerar novamente" : "Melhorar foto"}
          </button>
          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-app px-4 text-sm font-black text-app-text transition-colors hover:bg-line/25 disabled:opacity-55"
            disabled={!canDownload}
            onClick={() => void download()}
            type="button"
          >
            {status.kind === "downloading" ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Download aria-hidden="true" className="size-4" />
            )}
            Salvar na galeria
          </button>
        </div>
        <AiStudioBeforeAfter generation={generation} />
      </div>
    </ControlSection>
  );
}

function isPhotoMedia(
  media: ImageTemplateMedia & { index: number },
): media is IndexedImageTemplateMedia {
  return media.kind === undefined || media.kind === "photo";
}
