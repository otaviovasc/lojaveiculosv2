"use client";

import {
  MediaLibrary,
  type MediaAsset,
} from "@/components/MediaLibrary/MediaLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { StyleEditor } from "@/modules/storefront/components/builder/StyleEditor";
import {
  Columns,
  GripVertical,
  Image as ImageIcon,
  Layout,
  LayoutGrid,
  Maximize2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  alt?: string;
  linkUrl?: string;
  linkType?: "internal" | "external";
  colSpan?: number;
  rowSpan?: number;
  aspectRatio?: "auto" | "square" | "video" | "portrait" | "wide";
}

interface GalleryEditorProps {
  props: {
    title?: string;
    subtitle?: string;
    images?: GalleryImage[];
    layout?: "grid" | "mosaic" | "masonry" | "carousel";
    columns?: number;
    gap?: "none" | "sm" | "md" | "lg" | "xl";
    lightboxEnabled?: boolean;
    showCaptions?: boolean;
    style?: Record<string, unknown>;
  };
  onChange: (props: GalleryEditorProps["props"]) => void;
  workspaceSlug?: string;
}

export function GalleryEditor({
  props,
  onChange,
  workspaceSlug,
}: GalleryEditorProps) {
  const [activeTab, setActiveTab] = useState("content");
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [pickingImageId, setPickingImageId] = useState<string | null>(null);

  const updateProps = (newProps: Partial<GalleryEditorProps["props"]>) => {
    onChange({ ...props, ...newProps });
  };

  const openLibraryForImage = (imageId: string) => {
    setPickingImageId(imageId);
    setShowMediaLibrary(true);
  };

  const addImage = () => {
    const newImage: GalleryImage = {
      id: "img_" + Math.random().toString(36).substring(2, 9),
      url: "",
      caption: "",
      colSpan: 1,
      rowSpan: 1,
      aspectRatio: "auto",
    };
    updateProps({ images: [...(props.images || []), newImage] });
  };

  const updateImage = (id: string, updates: Partial<GalleryImage>) => {
    updateProps({
      images: (props.images || []).map((img) =>
        img.id === id ? { ...img, ...updates } : img,
      ),
    });
  };

  const handleMediaSelect = (asset: MediaAsset) => {
    if (pickingImageId) {
      updateImage(pickingImageId, { url: asset.url });
    }
    setShowMediaLibrary(false);
    setPickingImageId(null);
  };

  const removeImage = (id: string) => {
    updateProps({
      images: (props.images || []).filter((img) => img.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border/50 bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={cn(
            "rounded-md px-3 py-2 text-xs font-semibold transition-colors",
            activeTab === "content"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Conteúdo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("style")}
          className={cn(
            "rounded-md px-3 py-2 text-xs font-semibold transition-colors",
            activeTab === "style"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Estilo
        </button>
      </div>

      {activeTab === "content" && (
        <div className="space-y-6 pt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">
                Título
              </Label>
              <Input
                value={props.title || ""}
                onChange={(e) => updateProps({ title: e.target.value })}
                placeholder="Título da galeria"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">
                Subtítulo
              </Label>
              <Input
                value={props.subtitle || ""}
                onChange={(e) => updateProps({ subtitle: e.target.value })}
                placeholder="Subtítulo da galeria"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">
                Imagens
              </Label>
              <Button
                type="button"
                onClick={addImage}
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px]"
              >
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {(props.images || []).map((image) => (
                <div
                  key={image.id}
                  className="group rounded-xl border border-border/50 bg-muted/20 p-3 transition-all hover:border-border hover:bg-muted/30"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="cursor-move pt-1 opacity-30 hover:opacity-100">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        Imagem
                      </Label>
                      {image.url ? (
                        <div className="relative overflow-hidden rounded-lg border border-border/50">
                          <img
                            src={image.url}
                            alt=""
                            className="h-28 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => updateImage(image.id, { url: "" })}
                            className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!workspaceSlug}
                          onClick={() =>
                            workspaceSlug && openLibraryForImage(image.id)
                          }
                          className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 transition-colors hover:border-primary/50 hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-50"
                        >
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {workspaceSlug
                              ? "Clique para abrir a biblioteca"
                              : "Biblioteca indisponível"}
                          </span>
                        </button>
                      )}
                      {workspaceSlug ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-full text-xs"
                          onClick={() => openLibraryForImage(image.id)}
                        >
                          <Upload className="mr-2 h-3.5 w-3.5" />
                          Biblioteca
                        </Button>
                      ) : null}
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                          URL da imagem
                        </Label>
                        <Input
                          value={image.url}
                          onChange={(e) =>
                            updateImage(image.id, { url: e.target.value })
                          }
                          placeholder="https://..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                        Legenda
                      </Label>
                      <Input
                        value={image.caption || ""}
                        onChange={(e) =>
                          updateImage(image.id, { caption: e.target.value })
                        }
                        placeholder="Legenda"
                        className="h-7 text-[10px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                        Link (URL)
                      </Label>
                      <Input
                        value={image.linkUrl || ""}
                        onChange={(e) =>
                          updateImage(image.id, { linkUrl: e.target.value })
                        }
                        placeholder="https://..."
                        className="h-7 text-[10px]"
                      />
                    </div>
                  </div>

                  {props.layout === "mosaic" && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/30">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                          Colunas (1-3)
                        </Label>
                        <select
                          value={image.colSpan || 1}
                          onChange={(e) =>
                            updateImage(image.id, {
                              colSpan: parseInt(e.target.value),
                            })
                          }
                          className="h-7 w-full rounded-md border border-border/50 bg-background px-2 text-[10px]"
                        >
                          <option value={1}>1 Coluna</option>
                          <option value={2}>2 Colunas</option>
                          <option value={3}>3 Colunas</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                          Linhas (1-2)
                        </Label>
                        <select
                          value={image.rowSpan || 1}
                          onChange={(e) =>
                            updateImage(image.id, {
                              rowSpan: parseInt(e.target.value),
                            })
                          }
                          className="h-7 w-full rounded-md border border-border/50 bg-background px-2 text-[10px]"
                        >
                          <option value={1}>1 Linha</option>
                          <option value={2}>2 Linhas</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {(props.images || []).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border/50 rounded-xl opacity-40">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <p className="text-xs font-medium">
                    Nenhuma imagem adicionada
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "style" && (
        <div className="space-y-6 pt-2">
          <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Layout da Galeria
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "grid", label: "Grid", icon: LayoutGrid },
                { value: "mosaic", label: "Mosaico", icon: Layout },
                { value: "masonry", label: "Masonry", icon: Columns },
                { value: "carousel", label: "Carrossel", icon: Maximize2 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    updateProps({
                      layout: opt.value as
                        "grid" | "mosaic" | "masonry" | "carousel",
                    })
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5 text-xs font-bold transition-all",
                    props.layout === opt.value
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border/50 bg-card hover:border-border hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>

            {props.layout === "grid" && (
              <div className="space-y-2 pt-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  Colunas (Desktop)
                </Label>
                <div className="grid grid-cols-5 gap-1">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => updateProps({ columns: num })}
                      className={cn(
                        "rounded-md py-1.5 text-[10px] font-bold transition-all",
                        (props.columns || 3) === num
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground",
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                Espaçamento (Gap)
              </Label>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { value: "none", label: "0" },
                  { value: "sm", label: "P" },
                  { value: "md", label: "M" },
                  { value: "lg", label: "G" },
                  { value: "xl", label: "XG" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      updateProps({
                        gap: opt.value as "none" | "sm" | "md" | "lg" | "xl",
                      })
                    }
                    className={cn(
                      "rounded-md py-1.5 text-[10px] font-bold transition-all",
                      (props.gap || "md") === opt.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border/50"
                  checked={props.lightboxEnabled !== false}
                  onChange={(e) =>
                    updateProps({ lightboxEnabled: e.target.checked })
                  }
                />
                Habilitar Lightbox (Zoom)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border/50"
                  checked={props.showCaptions === true}
                  onChange={(e) =>
                    updateProps({ showCaptions: e.target.checked })
                  }
                />
                Sempre mostrar legendas
              </label>
            </div>
          </div>

          <StyleEditor
            style={props.style || {}}
            onChange={(style) => updateProps({ style })}
            workspaceSlug={workspaceSlug}
            componentType="gallery"
          />
        </div>
      )}

      {workspaceSlug ? (
        <MediaLibrary
          open={showMediaLibrary}
          onOpenChange={(open) => {
            setShowMediaLibrary(open);
            if (!open) setPickingImageId(null);
          }}
          onSelect={handleMediaSelect}
          workspaceSlug={workspaceSlug}
          accept="image"
          mode="select"
        />
      ) : null}
    </div>
  );
}
