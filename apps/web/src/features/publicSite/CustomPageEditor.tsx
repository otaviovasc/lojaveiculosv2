import { useEffect, useMemo, useState } from "react";
import type {
  StorefrontBuilderComponent,
  StorefrontBuilderComponentType,
  StorefrontBuilderConfig,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import {
  BuilderCanvas,
  createEditorBlock,
  CustomPageEditorTopBar,
  type BuilderViewportMode,
} from "./CustomPageEditorChrome";
import { BuilderInspector } from "./CustomPageEditorInspector";
import {
  BuilderBlockLibrary,
  BuilderBlockList,
} from "./CustomPageEditorLibrary";

export type CustomPageEditorProps = {
  config: StorefrontBuilderConfig;
  isSaving: boolean;
  onBack: () => void;
  onSave: (page: StorefrontCustomPage) => Promise<void>;
  page: StorefrontCustomPage;
};

export function CustomPageEditor({
  config,
  isSaving,
  onBack,
  onSave,
  page,
}: CustomPageEditorProps) {
  const [draft, setDraft] = useState(page);
  const [query, setQuery] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    page.components[0]?.id ?? null,
  );
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [viewportMode, setViewportMode] =
    useState<BuilderViewportMode>("desktop");

  useEffect(() => {
    setDraft(page);
    setSelectedComponentId(page.components[0]?.id ?? null);
    setShowPageSettings(false);
  }, [page]);

  const orderedComponents = useMemo(
    () => [...draft.components].sort((a, b) => a.order - b.order),
    [draft.components],
  );

  const selectedComponent =
    orderedComponents.find(
      (component) => component.id === selectedComponentId,
    ) ?? null;

  const dirty = useMemo(
    () => JSON.stringify(page) !== JSON.stringify(draft),
    [draft, page],
  );

  const addBlock = (type: StorefrontBuilderComponentType) => {
    const block = createEditorBlock(type, draft.components.length);
    setDraft((current) => ({
      ...current,
      components: [...current.components, block],
    }));
    setSelectedComponentId(block.id);
    setShowPageSettings(false);
  };

  const updateComponent = (
    componentId: string,
    update: Partial<StorefrontBuilderComponent>,
  ) => {
    setDraft((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId ? { ...component, ...update } : component,
      ),
    }));
  };

  const duplicateComponent = (component: StorefrontBuilderComponent) => {
    const block: StorefrontBuilderComponent = {
      ...component,
      id: `${component.id}-${Date.now()}`,
      order: draft.components.length,
      props: JSON.parse(JSON.stringify(component.props)) as Record<
        string,
        unknown
      >,
    };
    setDraft((current) => ({
      ...current,
      components: [...current.components, block],
    }));
    setSelectedComponentId(block.id);
    setShowPageSettings(false);
  };

  const removeComponent = (componentId: string) => {
    const nextSelected =
      orderedComponents.find((component) => component.id !== componentId)?.id ??
      null;
    setDraft((current) => ({
      ...current,
      components: current.components
        .filter((component) => component.id !== componentId)
        .map((component, order) => ({ ...component, order })),
    }));
    setSelectedComponentId(nextSelected);
  };

  const moveComponent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedComponents.length) return;
    setDraft((current) => {
      const nextComponents = [...current.components].sort(
        (a, b) => a.order - b.order,
      );
      const [movedComponent] = nextComponents.splice(fromIndex, 1);
      if (!movedComponent) return current;
      nextComponents.splice(toIndex, 0, movedComponent);
      return {
        ...current,
        components: nextComponents.map((component, order) => ({
          ...component,
          order,
        })),
      };
    });
  };

  const save = async () => {
    await onSave({
      ...draft,
      components: orderedComponents.map((component, order) => ({
        ...component,
        order,
      })),
    });
  };

  const copyPreviewUrl = () => {
    const previewUrl =
      draft.previewUrl ?? draft.publicUrl ?? `/p/${draft.slug}`;
    void navigator.clipboard?.writeText(previewUrl);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden bg-background lg:h-dvh">
      <CustomPageEditorTopBar
        dirty={dirty}
        isSaving={isSaving}
        onBack={onBack}
        onCopyPreview={copyPreviewUrl}
        onSave={() => void save()}
        onShowSettings={() => setShowPageSettings(true)}
        page={draft}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 flex-col overflow-hidden border-r border-border/50 bg-card/50 lg:flex">
          <BuilderBlockLibrary
            onAdd={addBlock}
            query={query}
            setQuery={setQuery}
          />
          <BuilderBlockList
            components={orderedComponents}
            onDuplicate={duplicateComponent}
            onMove={moveComponent}
            onRemove={removeComponent}
            onSelect={(componentId) => {
              setSelectedComponentId(componentId);
              setShowPageSettings(false);
            }}
            onToggle={(component) =>
              updateComponent(component.id, { visible: !component.visible })
            }
            selectedId={selectedComponentId}
          />
        </aside>
        <BuilderCanvas
          config={config}
          draft={draft}
          onViewportChange={setViewportMode}
          viewportMode={viewportMode}
        />
        <BuilderInspector
          component={selectedComponent}
          config={config}
          draft={draft}
          onDraftChange={setDraft}
          onRemove={removeComponent}
          onSelectedComponentChange={(component) =>
            updateComponent(component.id, component)
          }
          showPageSettings={showPageSettings}
        />
      </div>
    </div>
  );
}
