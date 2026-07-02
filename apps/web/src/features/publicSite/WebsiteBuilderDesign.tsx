import {
  Check,
  ExternalLink,
  Eye,
  Loader2,
  Palette,
  Save,
  Smartphone,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StoreSettingsSnapshot } from "../settings/types";
import { WebsiteBuilderEditorPanel } from "./WebsiteBuilderEditorPanel";
import {
  applyWebsiteConfigToSettings,
  createWebsiteConfigFromSettings,
} from "./WebsiteBuilderModel";
import { createWebsiteBuilderAccordionItems } from "./WebsiteBuilderDesignItems";
import {
  WebsiteBuilderPreviewFrame,
  type WebsiteBuilderPreviewFrameHandle,
} from "./WebsiteBuilderPreviewFrame";
import type {
  WebsiteBuilderConfig,
  WebsiteBuilderSaveInput,
  WebsiteBuilderTemplateId,
  WebsiteBuilderViewportMode,
} from "./WebsiteBuilderTypes";

export function WebsiteBuilderDesign({
  isSaving,
  onDirty,
  onSave,
  settings,
  statusMessage,
}: {
  isSaving: boolean;
  onDirty?: () => void;
  onSave: (input: WebsiteBuilderSaveInput) => Promise<void>;
  settings: StoreSettingsSnapshot;
  statusMessage?: { text: string; type: "error" | "success" } | null;
}) {
  const initialConfig = useMemo(
    () => createWebsiteConfigFromSettings(settings),
    [settings],
  );
  const [config, setConfig] = useState<WebsiteBuilderConfig>(initialConfig);
  const [templateId, setTemplateId] = useState<WebsiteBuilderTemplateId>(
    initialConfig.templateId,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewportMode, setViewportMode] =
    useState<WebsiteBuilderViewportMode>("desktop");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const previewRef = useRef<WebsiteBuilderPreviewFrameHandle>(null);
  const slug = settings.identity.publicSlug;

  useEffect(() => {
    setConfig(initialConfig);
    setTemplateId(initialConfig.templateId);
    setHasUnsavedChanges(false);
  }, [initialConfig]);

  const updateConfig = <K extends keyof WebsiteBuilderConfig>(
    key: K,
    value: WebsiteBuilderConfig[K],
  ) => {
    onDirty?.();
    setConfig((current) => ({ ...current, [key]: value }));
    setHasUnsavedChanges(true);
    previewRef.current?.postUpdate({ [key]: value });
  };

  const save = async () => {
    await onSave({
      config,
      settings: applyWebsiteConfigToSettings(settings, config, templateId),
      templateId,
    });
    setHasUnsavedChanges(false);
  };

  const accordionItems = createWebsiteBuilderAccordionItems({
    config,
    setTemplateId,
    templateId,
    updateConfig,
  });

  return (
    <div className="website-builder-surface flex h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden text-foreground lg:h-dvh">
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Palette className="h-4 w-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-foreground">Personalizar</h1>
            <p className="text-xs text-muted-foreground">Editor Visual</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="hidden sm:flex"
            size="sm"
            variant="outline"
            asChild
          >
            <a href={`/${slug}`} rel="noopener noreferrer" target="_blank">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Visualizar
            </a>
          </Button>
          <Button
            className="relative"
            disabled={isSaving}
            onClick={() => void save()}
            size="sm"
            type="button"
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isSaving ? "Salvando..." : "Salvar"}
            {hasUnsavedChanges && !isSaving ? (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-card bg-warning" />
            ) : null}
          </Button>
        </div>
      </div>

      {statusMessage ? <WebsiteBuilderStatus message={statusMessage} /> : null}
      <WebsiteBuilderMobileTabs active={mobileTab} onChange={setMobileTab} />

      {showMobilePreview ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <span className="text-sm font-semibold">Preview</span>
            <Button
              onClick={() => setShowMobilePreview(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-1">
            <WebsiteBuilderPreviewFrame
              config={config}
              onViewportChange={() => undefined}
              ref={previewRef}
              slug={slug}
              templateId={templateId}
              viewportMode="mobile"
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            "flex w-full flex-col overflow-y-auto border-r border-border/50 bg-card/50 md:flex md:w-[380px] lg:w-[420px]",
            mobileTab === "edit" ? "flex" : "hidden",
          )}
        >
          <WebsiteBuilderEditorPanel items={accordionItems} />
        </div>

        <div
          className={cn(
            "flex-1 md:flex",
            mobileTab === "preview" ? "flex" : "hidden",
          )}
        >
          <WebsiteBuilderPreviewFrame
            config={config}
            onViewportChange={setViewportMode}
            ref={previewRef}
            slug={slug}
            templateId={templateId}
            viewportMode={mobileTab === "preview" ? "mobile" : viewportMode}
          />
        </div>
      </div>

      {mobileTab === "edit" && !showMobilePreview ? (
        <button
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95 md:hidden"
          onClick={() => setShowMobilePreview(true)}
          type="button"
        >
          <Smartphone className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}

function WebsiteBuilderStatus({
  message,
}: {
  message: { text: string; type: "error" | "success" };
}) {
  return (
    <div
      className={cn(
        "mx-4 mt-2 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium",
        message.type === "success"
          ? "bg-success/10 text-success"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {message.type === "success" ? <Check className="h-3.5 w-3.5" /> : null}
      {message.text}
    </div>
  );
}

function WebsiteBuilderMobileTabs({
  active,
  onChange,
}: {
  active: "edit" | "preview";
  onChange: (tab: "edit" | "preview") => void;
}) {
  return (
    <div className="flex shrink-0 border-b border-border/50 md:hidden">
      {[
        { icon: Palette, label: "Editar", value: "edit" },
        { icon: Eye, label: "Preview", value: "preview" },
      ].map((item) => {
        const Icon = item.icon;
        const value = item.value as "edit" | "preview";
        return (
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors",
              active === value
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground",
            )}
            key={item.value}
            onClick={() => onChange(value)}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
