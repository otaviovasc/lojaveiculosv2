import type {
  StorefrontBuilderComponent,
  StorefrontBuilderComponentType,
  StorefrontBuilderConfig,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import { Copy, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { cx } from "../../components/ui/featureShared";
import { BuilderBlockPropsEditor } from "./BuilderBlockEditors";
import { blockLabel, createDefaultPageComponent } from "./builderBlockCatalog";

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
      <aside className="w-full shrink-0 overflow-y-auto border-l border-line bg-panel/70 p-4 lg:w-80">
        <PageSettingsFields
          config={config}
          draft={draft}
          onDraftChange={onDraftChange}
        />
      </aside>
    );
  }

  return (
    <aside className="w-full shrink-0 overflow-y-auto border-l border-line bg-panel/70 p-4 lg:w-80">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted">
            Ajustes do bloco
          </p>
          <h3 className="truncate text-base font-black">
            {blockLabel(component.type)}
          </h3>
        </div>
        <button
          aria-label="Remover bloco"
          className="flex size-9 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10"
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

export function BuilderBlockList({
  components,
  onDuplicate,
  onMove,
  onRemove,
  onSelect,
  onToggle,
  selectedId,
}: {
  components: readonly StorefrontBuilderComponent[];
  onDuplicate: (component: StorefrontBuilderComponent) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (componentId: string) => void;
  onSelect: (componentId: string) => void;
  onToggle: (component: StorefrontBuilderComponent) => void;
  selectedId: string | null;
}) {
  return (
    <div className="border-t border-line p-3">
      <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted">
        Blocos da pagina
      </h3>
      {components.length ? (
        <div className="grid gap-2">
          {components.map((component, index) => (
            <button
              className={cx(
                "group flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all",
                selectedId === component.id
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-line bg-app text-muted hover:border-line-strong hover:text-app-text",
              )}
              key={component.id}
              onClick={() => onSelect(component.id)}
              type="button"
            >
              <GripVertical className="size-4 shrink-0 opacity-50" />
              <span className="min-w-0 flex-1 truncate text-sm font-black">
                {blockLabel(component.type)}
              </span>
              <BlockListActions
                canMoveDown={index < components.length - 1}
                canMoveUp={index > 0}
                component={component}
                index={index}
                onDuplicate={onDuplicate}
                onMove={onMove}
                onRemove={onRemove}
                onToggle={onToggle}
              />
            </button>
          ))}
        </div>
      ) : (
        <FeatureAlert>Nenhum bloco adicionado.</FeatureAlert>
      )}
    </div>
  );
}

function BlockListActions({
  canMoveDown,
  canMoveUp,
  component,
  index,
  onDuplicate,
  onMove,
  onRemove,
  onToggle,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  component: StorefrontBuilderComponent;
  index: number;
  onDuplicate: (component: StorefrontBuilderComponent) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (componentId: string) => void;
  onToggle: (component: StorefrontBuilderComponent) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <MiniAction
        disabled={!canMoveUp}
        label="Mover para cima"
        onClick={() => onMove(index, index - 1)}
      >
        ↑
      </MiniAction>
      <MiniAction
        disabled={!canMoveDown}
        label="Mover para baixo"
        onClick={() => onMove(index, index + 1)}
      >
        ↓
      </MiniAction>
      <MiniAction label="Duplicar" onClick={() => onDuplicate(component)}>
        <Copy aria-hidden="true" className="size-3.5" />
      </MiniAction>
      <MiniAction
        label="Alternar visibilidade"
        onClick={() => onToggle(component)}
      >
        {component.visible ? (
          <Eye aria-hidden="true" className="size-3.5" />
        ) : (
          <EyeOff aria-hidden="true" className="size-3.5" />
        )}
      </MiniAction>
      <MiniAction label="Remover" onClick={() => onRemove(component.id)}>
        <Trash2 aria-hidden="true" className="size-3.5" />
      </MiniAction>
    </span>
  );
}

function MiniAction({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <span
      aria-disabled={disabled}
      aria-label={label}
      className={cx(
        "flex size-7 items-center justify-center rounded-md text-xs font-black transition-colors hover:bg-panel",
        disabled && "pointer-events-none opacity-30",
      )}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onClick();
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </span>
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
        <p className="text-[10px] font-black uppercase tracking-widest text-muted">
          Configuracoes da pagina
        </p>
        <h3 className="text-base font-black text-app-text">{draft.title}</h3>
      </div>
      <FeatureField label="Titulo">
        <FeatureInput
          maxLength={120}
          onChange={(event) =>
            onDraftChange({ ...draft, title: event.target.value })
          }
          value={draft.title}
        />
      </FeatureField>
      <FeatureField label="Slug">
        <FeatureInput
          maxLength={80}
          onChange={(event) =>
            onDraftChange({ ...draft, slug: event.target.value })
          }
          value={draft.slug}
        />
      </FeatureField>
      <FeatureField label="Descricao">
        <FeatureTextarea
          maxLength={320}
          onChange={(event) =>
            onDraftChange({ ...draft, description: event.target.value })
          }
          value={draft.description ?? ""}
        />
      </FeatureField>
      <div className="grid grid-cols-2 gap-3">
        <FeatureField label="Destaque">
          <FeatureInput
            onChange={(event) =>
              onDraftChange({ ...draft, accentColor: event.target.value })
            }
            type="color"
            value={draft.accentColor ?? config.accentColor}
          />
        </FeatureField>
        <FeatureField label="Fundo">
          <FeatureInput
            onChange={(event) =>
              onDraftChange({ ...draft, backgroundColor: event.target.value })
            }
            type="color"
            value={draft.backgroundColor ?? config.backgroundColor}
          />
        </FeatureField>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-app p-3 text-sm font-black">
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

export function createEditorBlock(
  type: StorefrontBuilderComponentType,
  order: number,
) {
  return createDefaultPageComponent(type, order);
}
