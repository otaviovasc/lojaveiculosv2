import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Factory,
  Image as ImageIcon,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cx } from "../../../components/ui/featureShared";
import type {
  AiStudioGenerationResult,
  AiStudioTemplate,
  AiStudioTemplateId,
} from "../model/aiStudioTypes";
import type { InventoryMedia } from "../model/types";

const templateIcons: Record<AiStudioTemplateId, LucideIcon> = {
  industrial_garage: Factory,
  premium_studio: Sparkles,
  urban_scene: Building2,
};

export function AiStudioPhotoStrip({
  media,
  selectedMediaId,
  onSelect,
}: {
  media: readonly InventoryMedia[];
  selectedMediaId: string | null;
  onSelect: (mediaId: string) => void;
}) {
  if (media.length === 0) {
    return (
      <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-line bg-app-elevated text-center">
        <div className="max-w-sm p-5">
          <ImageIcon
            aria-hidden="true"
            className="mx-auto mb-3 size-8 text-muted"
          />
          <p className="text-sm font-black text-app-text">
            Nenhuma foto externa cadastrada
          </p>
          <p className="mt-1 text-xs font-bold text-muted">
            Adicione fotos à galeria do veículo antes de usar o Estúdio Digital
            IA.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {media.map((item) => (
        <button
          aria-label={`Selecionar foto ${item.displayOrder + 1}`}
          className={cx(
            "relative aspect-[4/3] overflow-hidden rounded-lg border bg-app-elevated transition-all",
            selectedMediaId === item.id
              ? "border-accent shadow-[var(--shadow-focus)]"
              : "border-line hover:border-accent/60",
          )}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <img
            alt={item.altText ?? "Foto do veículo"}
            className="size-full object-cover"
            src={item.url}
          />
          {selectedMediaId === item.id ? (
            <span className="absolute right-2 top-2 rounded-full bg-accent p-1 text-inverse">
              <CheckCircle2 aria-hidden="true" className="size-3.5" />
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function AiStudioTemplateSelector({
  selectedTemplateId,
  templates,
  onSelect,
  variant = "grid",
}: {
  selectedTemplateId: AiStudioTemplateId;
  templates: readonly AiStudioTemplate[];
  onSelect: (templateId: AiStudioTemplateId) => void;
  variant?: "grid" | "stack";
}) {
  return (
    <div
      className={
        variant === "stack" ? "grid gap-2" : "grid gap-2 md:grid-cols-3"
      }
    >
      {templates.map((template) => {
        const Icon = templateIcons[template.id];
        const selected = selectedTemplateId === template.id;

        return (
          <button
            aria-pressed={selected}
            className={cx(
              "min-h-28 rounded-lg border p-3 text-left transition-all",
              selected
                ? "border-accent bg-accent-soft text-app-text shadow-[var(--shadow-focus)]"
                : "border-line bg-app-elevated text-muted hover:border-accent/60 hover:text-app-text",
            )}
            key={template.id}
            onClick={() => onSelect(template.id)}
            type="button"
          >
            <span className="mb-3 flex size-9 items-center justify-center rounded-lg border border-line bg-panel text-accent">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="block text-sm font-black">{template.label}</span>
            <span className="mt-1 block text-xs font-bold leading-relaxed">
              {template.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AiStudioBeforeAfter({
  generation,
}: {
  generation: AiStudioGenerationResult | null;
}) {
  if (!generation) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <PreviewImage label="Antes" src={generation.beforeUrl} />
      <PreviewImage label="Depois" src={generation.generatedUrl} featured />
    </div>
  );
}

export function AiStudioNotice() {
  return (
    <div className="rounded-lg border border-line bg-app-elevated p-3 text-xs font-bold leading-relaxed text-muted">
      <div className="mb-1 flex items-center gap-2 text-app-text">
        <AlertTriangle aria-hidden="true" className="size-4 text-warning" />
        <span>Dica:</span>
      </div>
      Selecione apenas fotos externas de corpo inteiro do veículo. Fotos de
      painel, bancos ou detalhes não devem ser enviadas para a IA para preservar
      o realismo dos detalhes.
    </div>
  );
}

function PreviewImage({
  featured,
  label,
  src,
}: {
  featured?: boolean;
  label: string;
  src: string;
}) {
  return (
    <figure
      className={cx(
        "overflow-hidden rounded-lg border bg-app-elevated",
        featured ? "border-accent" : "border-line",
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <figcaption className="text-xs font-black uppercase tracking-wider text-muted">
          {label}
        </figcaption>
        {featured ? (
          <Sparkles aria-hidden="true" className="size-4 text-accent" />
        ) : null}
      </div>
      <div className="aspect-[4/3] bg-app">
        <img
          alt={`${label} da geração IA`}
          className="size-full object-cover"
          src={src}
        />
      </div>
    </figure>
  );
}
