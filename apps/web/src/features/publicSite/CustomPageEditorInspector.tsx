import type {
  StorefrontBuilderComponent,
  StorefrontBuilderConfig,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BuilderBlockPropsEditor } from "./BuilderBlockEditors";
import { blockLabel } from "./builderBlockCatalog";

export function BuilderInspector({
  component,
  config,
  draft,
  onDraftChange,
  onRemove,
  onSelectedComponentChange,
  showPageSettings,
}: {
  component: StorefrontBuilderComponent | null;
  config: StorefrontBuilderConfig;
  draft: StorefrontCustomPage;
  onDraftChange: (page: StorefrontCustomPage) => void;
  onRemove: (componentId: string) => void;
  onSelectedComponentChange: (component: StorefrontBuilderComponent) => void;
  showPageSettings: boolean;
}) {
  if (showPageSettings || !component) {
    return (
      <aside className="w-full shrink-0 overflow-y-auto border-l border-border/50 bg-card/50 p-4 lg:w-80">
        <PageSettingsFields
          config={config}
          draft={draft}
          onDraftChange={onDraftChange}
        />
      </aside>
    );
  }

  return (
    <aside className="w-full shrink-0 overflow-y-auto border-l border-border/50 bg-card/50 p-4 lg:w-80">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ajustes do bloco
          </p>
          <h3 className="truncate text-base font-semibold">
            {blockLabel(component.type)}
          </h3>
        </div>
        <button
          aria-label="Remover bloco"
          className="flex size-9 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
          onClick={() => onRemove(component.id)}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
      <BuilderBlockPropsEditor
        component={component}
        onChange={onSelectedComponentChange}
      />
    </aside>
  );
}

function PageSettingsFields({
  config,
  draft,
  onDraftChange,
}: {
  config: StorefrontBuilderConfig;
  draft: StorefrontCustomPage;
  onDraftChange: (page: StorefrontCustomPage) => void;
}) {
  return (
    <div className="grid gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Configuracoes da pagina
        </p>
        <h3 className="text-base font-semibold text-foreground">
          {draft.title}
        </h3>
      </div>
      <div className="space-y-2">
        <Label>Titulo</Label>
        <Input
          maxLength={120}
          onChange={(event) =>
            onDraftChange({ ...draft, title: event.target.value })
          }
          value={draft.title}
        />
      </div>
      <div className="space-y-2">
        <Label>Slug</Label>
        <Input
          maxLength={80}
          onChange={(event) =>
            onDraftChange({ ...draft, slug: event.target.value })
          }
          value={draft.slug}
        />
      </div>
      <div className="space-y-2">
        <Label>Descricao</Label>
        <Textarea
          maxLength={320}
          onChange={(event) =>
            onDraftChange({ ...draft, description: event.target.value })
          }
          value={draft.description ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Destaque</Label>
          <Input
            onChange={(event) =>
              onDraftChange({ ...draft, accentColor: event.target.value })
            }
            type="color"
            value={draft.accentColor ?? config.accentColor}
          />
        </div>
        <div className="space-y-2">
          <Label>Fundo</Label>
          <Input
            onChange={(event) =>
              onDraftChange({ ...draft, backgroundColor: event.target.value })
            }
            type="color"
            value={draft.backgroundColor ?? config.backgroundColor}
          />
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm font-semibold">
        <span>Publicar pagina</span>
        <input
          checked={draft.visible}
          onChange={(event) =>
            onDraftChange({ ...draft, visible: event.target.checked })
          }
          type="checkbox"
        />
      </label>
    </div>
  );
}
