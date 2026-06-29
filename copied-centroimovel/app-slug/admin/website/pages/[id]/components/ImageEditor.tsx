"use client";

import {
  MediaLibrary,
  type MediaAsset,
} from "@/components/MediaLibrary/MediaLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ImageIcon, Upload, X } from "lucide-react";
import { useState } from "react";
import type { PropsEditorProps } from "./types";

const MAX_WIDTH_MOBILE = ["full", "sm", "md", "lg", "xl", "2xl"] as const;

const MAX_WIDTH_DESKTOP = [
  "full",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
] as const;

const MAX_WIDTH_LABEL: Record<string, string> = {
  full: "100%",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  "2xl": "2xl",
  "3xl": "3xl",
  "4xl": "4xl",
  "5xl": "5xl",
  "6xl": "6xl",
  "7xl": "7xl",
};

interface ImageEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
}

export function ImageEditor({
  props,
  onChange,
  workspaceSlug = "",
}: ImageEditorProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const handleAssetSelect = (asset: MediaAsset) => {
    onChange({ ...props, imageUrl: asset.url });
    setShowMediaLibrary(false);
  };

  const imageUrl = (props.imageUrl as string) || "";
  const style = (props.style as Record<string, unknown> | undefined) ?? {};
  const captionColor = (style.textColor as string) || "#57534e";

  const patchStyle = (partial: Record<string, unknown>) => {
    onChange({ ...props, style: { ...style, ...partial } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Imagem</Label>
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
        <Label>Legenda</Label>
        <Input
          value={(props.caption as string) || ""}
          onChange={(e) => onChange({ ...props, caption: e.target.value })}
          placeholder="Legenda opcional"
        />
      </div>

      <div className="space-y-2">
        <Label>Cor da legenda</Label>
        <div className="flex gap-2 items-center">
          <Input
            type="color"
            value={captionColor}
            onChange={(e) => patchStyle({ textColor: e.target.value })}
            className="h-9 w-14 cursor-pointer shrink-0 p-1"
          />
          <Input
            value={captionColor}
            onChange={(e) => patchStyle({ textColor: e.target.value })}
            placeholder="#57534e"
            className="font-mono text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Largura máxima no celular</Label>
        <p className="text-xs text-muted-foreground">
          Até telas menores que <span className="font-mono">md</span> (tablet /
          desktop usam a opção abaixo).
        </p>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
          {MAX_WIDTH_MOBILE.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...props, maxWidthMobile: key })}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors",
                ((props.maxWidthMobile as string) || "full") === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground",
              )}
            >
              {MAX_WIDTH_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Largura máxima no PC</Label>
        <p className="text-xs text-muted-foreground">
          A partir do breakpoint <span className="font-mono">md</span> em
          diante.
        </p>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6">
          {MAX_WIDTH_DESKTOP.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...props, maxWidthDesktop: key })}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors",
                ((props.maxWidthDesktop as string) || "5xl") === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground",
              )}
            >
              {MAX_WIDTH_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Alinhamento</Label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => {
                const st = { ...style };
                delete st.textAlign;
                onChange({ ...props, alignment: align, style: st });
              }}
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg py-2 text-sm transition-colors",
                (props.alignment as string) === align
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {align === "left" && "Esquerda"}
              {align === "center" && "Centro"}
              {align === "right" && "Direita"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="lightboxEnabled"
          checked={(props.lightboxEnabled as boolean) ?? true}
          onChange={(e) =>
            onChange({ ...props, lightboxEnabled: e.target.checked })
          }
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="lightboxEnabled" className="cursor-pointer">
          Habilitar Lightbox
        </Label>
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
