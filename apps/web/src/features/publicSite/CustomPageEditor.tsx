import { Monitor, Plus, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  StorefrontBuilderComponent,
  StorefrontBuilderComponentType,
  StorefrontBuilderConfig,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import { cn } from "@/lib/utils";
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
  onSave: (page: StorefrontCustomPage) => Promise<boolean>;
  page: StorefrontCustomPage;
  statusMessage?: { text: string; type: "error" | "success" } | null;
  storeSlug: string;
};

export function CustomPageEditor({
  config,
  isSaving,
  onBack,
  onSave,
  page,
  statusMessage,
  storeSlug,
}: CustomPageEditorProps) {
  const [draft, setDraft] = useState(page);
  const [query, setQuery] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    page.components[0]?.id ?? null,
  );
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [viewportMode, setViewportMode] =
    useState<BuilderViewportMode>("desktop");
  const [activeTab, setActiveTab] = useState<"blocks" | "canvas" | "editor">(
    "canvas",
  );
  const pageIdRef = useRef(page.id);

  useEffect(() => {
    const changedPage = pageIdRef.current !== page.id;
    pageIdRef.current = page.id;
    setDraft(page);
    setSelectedComponentId((current) => {
      if (changedPage) return page.components[0]?.id ?? null;
      return current &&
        page.components.some((component) => component.id === current)
        ? current
        : (page.components[0]?.id ?? null);
    });
    if (changedPage) {
      setShowPageSettings(false);
      setActiveTab("canvas");
    }
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

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const addBlock = (type: StorefrontBuilderComponentType) => {
    const block = createEditorBlock(type, draft.components.length);
    setDraft((current) => ({
      ...current,
      components: [...current.components, block],
    }));
    setSelectedComponentId(block.id);
    setShowPageSettings(false);
    if (window.innerWidth < 1024) setActiveTab("canvas");
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

  const togglePublished = async () => {
    const previousDraft = draft;
    const nextDraft = { ...draft, visible: !draft.visible };
    setDraft(nextDraft);
    const saved = await onSave({
      ...nextDraft,
      components: orderedComponents.map((component, order) => ({
        ...component,
        order,
      })),
    });
    if (!saved) setDraft(previousDraft);
  };

  const copyPreviewUrl = () => {
    const previewUrl = `/${storeSlug}/p/${draft.slug}${
      draft.secretToken ? `?token=${encodeURIComponent(draft.secretToken)}` : ""
    }`;
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
        onShowSettings={() => {
          setShowPageSettings(true);
          setActiveTab("editor");
        }}
        onTogglePublished={() => void togglePublished()}
        page={draft}
        previewUrl={`/${storeSlug}/p/${draft.slug}${
          draft.secretToken
            ? `?token=${encodeURIComponent(draft.secretToken)}`
            : ""
        }`}
      />
      {statusMessage ? (
        <div
          className={cn(
            "mx-4 mt-2 rounded-lg px-4 py-2.5 text-xs font-bold",
            statusMessage.type === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success",
          )}
        >
          {statusMessage.text}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "w-full shrink-0 flex-col overflow-hidden border-r border-border/50 bg-card/50 lg:flex lg:w-64",
            activeTab === "blocks" ? "flex" : "hidden lg:flex",
          )}
        >
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
              setActiveTab("editor");
            }}
            onToggle={(component) =>
              updateComponent(component.id, { visible: !component.visible })
            }
            selectedId={selectedComponentId}
          />
        </aside>
        <BuilderCanvas
          className={activeTab === "canvas" ? "flex" : "hidden lg:flex"}
          config={config}
          draft={draft}
          onViewportChange={setViewportMode}
          viewportMode={viewportMode}
        />
        <BuilderInspector
          className={activeTab === "editor" ? "block" : "hidden lg:block"}
          component={selectedComponent}
          config={config}
          draft={draft}
          onDraftChange={setDraft}
          onRemove={removeComponent}
          onSelectedComponentChange={(component) =>
            updateComponent(component.id, component)
          }
          previewUrl={`/${storeSlug}/p/${draft.slug}${
            draft.secretToken
              ? `?token=${encodeURIComponent(draft.secretToken)}`
              : ""
          }`}
          showPageSettings={showPageSettings}
        />
      </div>
      <div className="z-40 flex shrink-0 items-center justify-around border-t border-border/50 bg-card px-4 py-2 shadow-lg lg:hidden">
        <MobileEditorTab
          active={activeTab === "blocks"}
          icon={Plus}
          label="Blocos"
          onClick={() => setActiveTab("blocks")}
        />
        <MobileEditorTab
          active={activeTab === "canvas"}
          icon={Monitor}
          label="Canvas"
          onClick={() => setActiveTab("canvas")}
        />
        <MobileEditorTab
          active={activeTab === "editor"}
          hasIndicator={Boolean(selectedComponent) || showPageSettings}
          icon={Settings}
          label="Ajustes"
          onClick={() => setActiveTab("editor")}
        />
      </div>
    </div>
  );
}

function MobileEditorTab({
  active,
  hasIndicator,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  hasIndicator?: boolean;
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-all sm:text-xs",
        active
          ? "bg-primary/5 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
      <span>{label}</span>
      {hasIndicator ? (
        <span className="absolute right-[calc(50%-14px)] top-1.5 size-2 rounded-full border border-card bg-primary" />
      ) : null}
    </button>
  );
}
