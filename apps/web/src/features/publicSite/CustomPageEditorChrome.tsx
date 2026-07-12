import type {
  StorefrontBuilderComponentType,
  StorefrontBuilderConfig,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Monitor,
  Save,
  Settings,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomPagePreviewFrame } from "./CustomPagePreviewFrame";
import { PageBuilderRenderer } from "./PageBuilderRenderer";
import { createDefaultPageComponent } from "./builderBlockCatalog";

export type BuilderViewportMode = "desktop" | "mobile" | "tablet";

export function CustomPageEditorTopBar({
  dirty,
  isSaving,
  onBack,
  onCopyPreview,
  onSave,
  onShowSettings,
  onTogglePublished,
  page,
  previewUrl,
}: {
  dirty: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCopyPreview: () => void;
  onSave: () => void;
  onShowSettings: () => void;
  onTogglePublished: () => void;
  page: StorefrontCustomPage;
  previewUrl: string;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-4 py-2.5 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button
          aria-label="Voltar para páginas"
          onClick={onBack}
          size="xs"
          title="Voltar"
          type="button"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
        <div className="h-6 w-px bg-border" />
        <div className="min-w-0">
          <h1 className="max-w-[120px] truncate text-sm font-bold sm:max-w-none">
            {page.title}
          </h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            /p/{page.slug}
          </p>
        </div>
        <button
          className={cn(
            "hidden rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors sm:inline-flex",
            page.visible
              ? "border-success/40 bg-success text-success-foreground hover:bg-success/90"
              : "border-warning/40 bg-warning text-warning-foreground hover:bg-warning/90",
          )}
          disabled={isSaving}
          onClick={onTogglePublished}
          title={page.visible ? "Voltar para rascunho" : "Publicar página"}
          type="button"
        >
          {page.visible ? "Publicado" : "Rascunho"}
        </button>
        {dirty ? (
          <span className="mr-2 hidden items-center gap-1.5 text-xs font-medium text-warning lg:flex">
            <span className="size-2 rounded-full bg-warning" />
            Alterações não salvas
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          aria-label="Abrir configurações da página"
          onClick={onShowSettings}
          size="xs"
          title="Configurações"
          type="button"
          variant="outline"
        >
          <Settings className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Configurações</span>
        </Button>
        <Button
          aria-label="Copiar prévia"
          onClick={onCopyPreview}
          size="xs"
          title="Copiar prévia"
          type="button"
          variant="outline"
        >
          <Copy className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Copiar</span>
        </Button>
        <Button size="xs" variant="outline" asChild>
          <a
            aria-label="Visualizar página"
            href={previewUrl}
            rel="noreferrer"
            target="_blank"
            title="Visualizar"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Visualizar</span>
          </a>
        </Button>
        <Button
          aria-label="Salvar página"
          disabled={isSaving}
          onClick={onSave}
          size="xs"
          title="Salvar"
          type="button"
        >
          <Save className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">
            {isSaving ? "Salvando..." : "Salvar"}
          </span>
        </Button>
      </div>
    </div>
  );
}

export function BuilderCanvas({
  className,
  config,
  draft,
  onBlockSelect,
  onViewportChange,
  selectedComponentId,
  viewportMode,
}: {
  className?: string;
  config: StorefrontBuilderConfig;
  draft: StorefrontCustomPage;
  onBlockSelect: (componentId: string) => void;
  onViewportChange: (mode: BuilderViewportMode) => void;
  selectedComponentId: string | null;
  viewportMode: BuilderViewportMode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 flex-1 flex-col overflow-hidden bg-muted/30",
        className,
      )}
    >
      <ViewportSwitcher value={viewportMode} onChange={onViewportChange} />
      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-3 lg:p-5">
        <CustomPagePreviewFrame
          mode={viewportMode}
          onSelectBlock={onBlockSelect}
        >
          <PageBuilderRenderer
            config={config}
            onSelectComponent={onBlockSelect}
            page={draft}
            preview
            selectedComponentId={selectedComponentId}
          />
        </CustomPagePreviewFrame>
      </div>
    </section>
  );
}

export function createEditorBlock(
  type: StorefrontBuilderComponentType,
  order: number,
) {
  return createDefaultPageComponent(type, order);
}

function ViewportSwitcher({
  onChange,
  value,
}: {
  onChange: (mode: BuilderViewportMode) => void;
  value: BuilderViewportMode;
}) {
  const options = [
    { icon: Monitor, label: "Desktop", value: "desktop" },
    { icon: Tablet, label: "Tablet", value: "tablet" },
    { icon: Smartphone, label: "Mobile", value: "mobile" },
  ] as const;

  return (
    <div className="flex shrink-0 items-center justify-center gap-1 border-b border-border/50 bg-card/50 px-4 py-2">
      {options.map((option) => {
        const OptionIcon = option.icon;
        const active = option.value === value;
        return (
          <button
            aria-label={option.label}
            aria-pressed={active}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <OptionIcon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
