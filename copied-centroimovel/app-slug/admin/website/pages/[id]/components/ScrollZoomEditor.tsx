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
import { GripVertical, Plus, X } from "lucide-react";
import { useState } from "react";
import type { PropsEditorProps } from "./types";

interface ScrollZoomImage {
  src: string;
  alt?: string;
}

interface ScrollZoomEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
}

export function ScrollZoomEditor({
  props,
  onChange,
  workspaceSlug = "",
}: ScrollZoomEditorProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(
    null,
  );

  const images: ScrollZoomImage[] = (props.images as ScrollZoomImage[]) || [];
  const title = (props.title as string) || "FOQUE NAS VENDAS";
  const subtitle = (props.subtitle as string) || "";
  const showTitle = (props.showTitle as boolean) ?? true;
  const titlePosition =
    (props.titlePosition as "center" | "bottom") || "center";
  const containerHeight = (props.containerHeight as string) || "300vh";

  const handleAssetSelect = (asset: MediaAsset) => {
    const newImages = [...images];
    const imageData: ScrollZoomImage = {
      src: asset.url,
      alt: asset.name,
    };
    if (editingImageIndex !== null) {
      newImages[editingImageIndex] = imageData;
    } else {
      newImages.push(imageData);
    }
    onChange({ ...props, images: newImages });
    setShowMediaLibrary(false);
    setEditingImageIndex(null);
  };

  const handleMultiAssetSelect = (assets: MediaAsset[]) => {
    const maxImages = 7;
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setShowMediaLibrary(false);
      return;
    }
    const newImages = [...images];
    const assetsToAdd = assets.slice(0, remainingSlots);
    for (const asset of assetsToAdd) {
      newImages.push({
        src: asset.url,
        alt: asset.name,
      });
    }
    onChange({ ...props, images: newImages });
    setShowMediaLibrary(false);
    setEditingImageIndex(null);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange({ ...props, images: newImages });
  };

  const updateImageAlt = (index: number, alt: string) => {
    const newImages = [...images];
    const existing = newImages[index];
    newImages[index] = { src: existing?.src || "", alt };
    onChange({ ...props, images: newImages });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Imagens ({images.length}/7)</Label>
        <p className="text-[10px] text-muted-foreground">
          A primeira imagem será a imagem principal (que fica em destaque)
        </p>

        <div className="space-y-2">
          {images.map((image, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border p-2"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded">
                <img
                  src={image.src}
                  alt={image.alt || ""}
                  className="h-full w-full object-cover"
                />
                {index === 0 && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <span className="text-[10px] text-primary font-medium">
                      Main
                    </span>
                  </div>
                )}
              </div>
              <Input
                value={image.alt || ""}
                onChange={(e) => updateImageAlt(index, e.target.value)}
                placeholder="Descrição da imagem"
                className="flex-1 text-xs"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="rounded p-1 hover:bg-destructive/10 text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {images.length < 7 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                setEditingImageIndex(null);
                setShowMediaLibrary(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {images.length === 0 ? "Selecionar Imagens" : "Adicionar Mais"}
              {images.length > 0 && ` (${images.length}/7)`}
            </Button>
          )}
          {images.length > 0 && images.length < 7 && (
            <p className="text-[10px] text-muted-foreground text-center">
              ou selecione várias de uma vez
            </p>
          )}
        </div>
      </div>

      {workspaceSlug && (
        <MediaLibrary
          open={showMediaLibrary}
          onOpenChange={setShowMediaLibrary}
          onSelect={handleAssetSelect}
          onMultiSelect={handleMultiAssetSelect}
          workspaceSlug={workspaceSlug}
          accept="image"
          mode="select"
          multiSelect={true}
          maxSelect={7 - images.length}
        />
      )}

      <div className="space-y-2">
        <Label>Texto Principal</Label>
        <Input
          value={title}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          placeholder="FOQUE NAS VENDAS"
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label>Subtítulo (opcional)</Label>
        <Textarea
          value={subtitle}
          onChange={(e) => onChange({ ...props, subtitle: e.target.value })}
          placeholder="Uma linha complementar..."
          rows={2}
          className="text-xs"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showTitle"
          checked={showTitle}
          onChange={(e) => onChange({ ...props, showTitle: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="showTitle" className="cursor-pointer">
          Mostrar texto sobre a imagem
        </Label>
      </div>

      {showTitle && (
        <>
          <div className="space-y-2">
            <Label>Posição do Texto</Label>
            <div className="flex gap-1">
              {[
                { value: "center", label: "Centro" },
                { value: "bottom", label: "Baixo" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onChange({ ...props, titlePosition: opt.value })
                  }
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                    titlePosition === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>Altura do Container</Label>
        <p className="text-[10px] text-muted-foreground">
          Quanto maior, mais tempo de scroll para a animação
        </p>
        <div className="grid grid-cols-4 gap-1">
          {[
            { value: "200vh", label: "2x" },
            { value: "250vh", label: "2.5x" },
            { value: "300vh", label: "3x" },
            { value: "350vh", label: "3.5x" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...props, containerHeight: opt.value })}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors",
                containerHeight === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
