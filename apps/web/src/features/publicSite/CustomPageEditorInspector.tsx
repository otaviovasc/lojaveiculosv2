import type {
  StorefrontBuilderComponent,
  StorefrontBuilderConfig,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuilderBlockPropsEditor } from "./BuilderBlockEditors";
import { blockLabel } from "./builderBlockCatalog";
import { PageSettingsFields } from "./CustomPageSettingsPanel";

export function BuilderInspector({
  component,
  config,
  draft,
  onDraftChange,
  onClose,
  onRemove,
  onSelectedComponentChange,
  showPageSettings,
  className,
  previewUrl,
}: {
  className?: string;
  component: StorefrontBuilderComponent | null;
  config: StorefrontBuilderConfig;
  draft: StorefrontCustomPage;
  onClose: () => void;
  onDraftChange: (page: StorefrontCustomPage) => void;
  onRemove: (componentId: string) => void;
  onSelectedComponentChange: (component: StorefrontBuilderComponent) => void;
  previewUrl: string;
  showPageSettings: boolean;
}) {
  if (showPageSettings || !component) {
    return (
      <aside
        className={cn(
          "w-full shrink-0 overflow-y-auto border-l border-border/50 bg-card p-4 lg:w-80",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configurações da página
          </p>
          <button
            aria-label="Fechar ajustes"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <PageSettingsFields
          config={config}
          draft={draft}
          onDraftChange={onDraftChange}
          previewUrl={previewUrl}
        />
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "w-full shrink-0 overflow-y-auto border-l border-border/50 bg-card p-4 lg:w-80",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ajustes do bloco
          </p>
          <h3 className="truncate text-base font-semibold">
            {blockLabel(component.type)}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label="Remover bloco"
            className="flex size-9 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
            onClick={() => onRemove(component.id)}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-label="Fechar ajustes"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      <BuilderBlockPropsEditor
        component={component}
        onChange={onSelectedComponentChange}
      />
    </aside>
  );
}
