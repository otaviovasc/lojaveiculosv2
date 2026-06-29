"use client";

import {
  MediaLibrary,
  type MediaAsset,
} from "@/components/MediaLibrary/MediaLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  buildInternalPageUrl,
  fetchInternalPages,
  type InternalPage,
} from "./internalPageLinks";
import type { PropsEditorProps } from "./types";

interface HeroOverlay {
  enabled: boolean;
  type: "gradient" | "solid";
  color: string;
  opacity: number;
  gradientStops?: Array<{ color: string; position: number }>;
  gradientAngle?: number;
}

interface HeroEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
}

export function HeroEditor({
  props,
  onChange,
  workspaceSlug = "",
}: HeroEditorProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [internalPages, setInternalPages] = useState<InternalPage[]>([]);

  const overlay: HeroOverlay = (props.overlay as HeroOverlay) || {
    enabled: true,
    type: "gradient",
    color: "#000000",
    opacity: 50,
    gradientStops: [
      { color: "rgba(0,0,0,0.25)", position: 0 },
      { color: "rgba(0,0,0,0.5)", position: 40 },
      { color: "rgba(0,0,0,0.85)", position: 100 },
    ],
    gradientAngle: 180,
  };

  const updateOverlay = (updates: Partial<HeroOverlay>) => {
    onChange({ ...props, overlay: { ...overlay, ...updates } });
  };

  const handleAssetSelect = (asset: MediaAsset) => {
    onChange({ ...props, imageUrl: asset.url });
    setShowMediaLibrary(false);
  };

  const imageUrl = (props.imageUrl as string) || "";
  const ctaLinkType =
    (props.ctaLinkType as "internal" | "external") || "internal";
  const ctaUrl = (props.ctaUrl as string) || "";

  useEffect(() => {
    if (workspaceSlug && ctaLinkType === "internal") {
      fetchInternalPages(workspaceSlug)
        .then(setInternalPages)
        .catch(console.error);
    }
  }, [workspaceSlug, ctaLinkType]);

  const handleLinkTypeChange = (type: "internal" | "external") => {
    onChange({
      ...props,
      ctaLinkType: type,
      ctaUrl: type === "external" ? "https://" : "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Imagem de Fundo</Label>
        {imageUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-border/50">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-32 object-cover"
            />
            <button
              type="button"
              onClick={() => onChange({ ...props, imageUrl: "" })}
              className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowMediaLibrary(true)}
            className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Clique para selecionar
            </span>
          </button>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMediaLibrary(true)}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Biblioteca
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>URL da Imagem</Label>
        <Input
          value={imageUrl}
          onChange={(e) => onChange({ ...props, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>Título</Label>
        <Input
          value={(props.title as string) || ""}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          placeholder="Título do Hero"
        />
      </div>

      <div className="space-y-2">
        <Label>Subtítulo</Label>
        <Textarea
          value={(props.subtitle as string) || ""}
          onChange={(e) => onChange({ ...props, subtitle: e.target.value })}
          placeholder="Subtítulo opcional"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Texto do Badge</Label>
        <Input
          value={(props.badge as string) || ""}
          onChange={(e) => onChange({ ...props, badge: e.target.value })}
          placeholder="Ex: Novo Lançamento"
        />
      </div>

      <div className="space-y-2">
        <Label>Label do Botão</Label>
        <Input
          value={(props.ctaLabel as string) || ""}
          onChange={(e) => onChange({ ...props, ctaLabel: e.target.value })}
          placeholder="Ex: Ver Imóveis"
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de Link</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleLinkTypeChange("internal")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
              ctaLinkType === "internal"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80",
            )}
          >
            <FileText className="h-4 w-4" />
            Página Interna
          </button>
          <button
            type="button"
            onClick={() => handleLinkTypeChange("external")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
              ctaLinkType === "external"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80",
            )}
          >
            <Globe className="h-4 w-4" />
            Link Externo
          </button>
        </div>
      </div>

      {ctaLinkType === "internal" ? (
        <div className="space-y-2">
          <Label>Página Interna</Label>
          <select
            value={ctaUrl}
            onChange={(e) => onChange({ ...props, ctaUrl: e.target.value })}
            className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
          >
            <option value="">Selecione uma página...</option>
            {ctaUrl &&
              !internalPages.some(
                (page) =>
                  buildInternalPageUrl(
                    workspaceSlug,
                    page.slug,
                    page.visible ? undefined : page.secretToken,
                  ) === ctaUrl,
              ) && <option value={ctaUrl}>{ctaUrl}</option>}
            {internalPages.map((page) => (
              <option
                key={page.slug}
                value={buildInternalPageUrl(
                  workspaceSlug,
                  page.slug,
                  page.visible ? undefined : page.secretToken,
                )}
              >
                {page.visible ? page.label : `${page.label} (Rascunho)`}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>URL Externa</Label>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={ctaUrl}
              onChange={(e) => onChange({ ...props, ctaUrl: e.target.value })}
              placeholder="https://exemplo.com"
              type="url"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Estilo do Botão</Label>
        <div className="flex gap-1">
          {["primary", "secondary", "outline"].map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ ...props, buttonStyle: style })}
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-medium transition-colors",
                (props.buttonStyle as string) === style
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {style === "primary" && "Primário"}
              {style === "secondary" && "Secundário"}
              {style === "outline" && "Contorno"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Cor do Botão</Label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={(props.buttonColor as string) || "#C9A84C"}
              onChange={(e) =>
                onChange({ ...props, buttonColor: e.target.value })
              }
              className="h-8 w-8 cursor-pointer rounded border border-border/50"
            />
            <Input
              value={(props.buttonColor as string) || ""}
              onChange={(e) =>
                onChange({ ...props, buttonColor: e.target.value })
              }
              className="h-8 font-mono text-xs"
              placeholder="#C9A84C"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cor do Texto</Label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={(props.buttonTextColor as string) || "#FFFFFF"}
              onChange={(e) =>
                onChange({ ...props, buttonTextColor: e.target.value })
              }
              className="h-8 w-8 cursor-pointer rounded border border-border/50"
            />
            <Input
              value={(props.buttonTextColor as string) || ""}
              onChange={(e) =>
                onChange({ ...props, buttonTextColor: e.target.value })
              }
              className="h-8 font-mono text-xs"
              placeholder="#FFFFFF"
            />
          </div>
        </div>
      </div>

      {(props.buttonStyle as string) === "outline" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Cor da Borda</Label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={(props.buttonBorderColor as string) || "#FFFFFF"}
              onChange={(e) =>
                onChange({ ...props, buttonBorderColor: e.target.value })
              }
              className="h-8 w-8 cursor-pointer rounded border border-border/50"
            />
            <Input
              value={(props.buttonBorderColor as string) || ""}
              onChange={(e) =>
                onChange({ ...props, buttonBorderColor: e.target.value })
              }
              className="h-8 font-mono text-xs"
              placeholder="#FFFFFF"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="fullHeight"
          checked={(props.fullHeight as boolean) ?? true}
          onChange={(e) => onChange({ ...props, fullHeight: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="fullHeight" className="cursor-pointer">
          Altura total (fullscreen)
        </Label>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">
            Overlay (sobre imagem)
          </Label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overlay.enabled}
              onChange={(e) => updateOverlay({ enabled: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <span className="text-xs">
              {overlay.enabled ? "Ativado" : "Desativado"}
            </span>
          </label>
        </div>

        {overlay.enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Tipo de Overlay</Label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateOverlay({ type: "gradient" })}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-medium transition-colors",
                    overlay.type === "gradient"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80",
                  )}
                >
                  Gradiente
                </button>
                <button
                  type="button"
                  onClick={() => updateOverlay({ type: "solid" })}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-medium transition-colors",
                    overlay.type === "solid"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80",
                  )}
                >
                  Sólido
                </button>
              </div>
            </div>

            {overlay.type === "solid" ? (
              <div className="space-y-2">
                <Label className="text-xs">Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={overlay.color}
                    onChange={(e) => updateOverlay({ color: e.target.value })}
                    className="h-9 w-12 rounded cursor-pointer"
                  />
                  <Input
                    value={overlay.color}
                    onChange={(e) => updateOverlay({ color: e.target.value })}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">
                  Ângulo do Gradiente: {overlay.gradientAngle || 180}°
                </Label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={overlay.gradientAngle || 180}
                  onChange={(e) =>
                    updateOverlay({ gradientAngle: Number(e.target.value) })
                  }
                  className="h-2 w-full cursor-pointer"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Opacidade: {overlay.opacity}%</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={overlay.opacity}
                onChange={(e) =>
                  updateOverlay({ opacity: Number(e.target.value) })
                }
                className="h-2 w-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div
              className="h-12 w-full rounded-lg border border-border/50 relative overflow-hidden"
              style={{
                background:
                  overlay.type === "gradient"
                    ? `linear-gradient(${overlay.gradientAngle || 180}deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.85) 100%)`
                    : overlay.color,
                opacity: overlay.opacity / 100,
              }}
            />
          </>
        )}
      </div>

      {workspaceSlug && (
        <MediaLibrary
          open={showMediaLibrary}
          onOpenChange={setShowMediaLibrary}
          onSelect={handleAssetSelect}
          workspaceSlug={workspaceSlug}
          accept="image"
          mode="select"
        />
      )}
    </div>
  );
}
