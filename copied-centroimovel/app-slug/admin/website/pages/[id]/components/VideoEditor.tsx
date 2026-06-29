"use client";

import {
  MediaLibrary,
  type MediaAsset,
} from "@/components/MediaLibrary/MediaLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FilmIcon, Upload, X } from "lucide-react";
import { useState } from "react";
import type { PropsEditorProps } from "./types";

interface VideoEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
}

export function VideoEditor({
  props,
  onChange,
  workspaceSlug = "",
}: VideoEditorProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const handleAssetSelect = (asset: MediaAsset) => {
    onChange({
      ...props,
      videoUrl: asset.url,
      provider: asset.type === "video" ? "upload" : props.provider,
    });
    setShowMediaLibrary(false);
  };

  const currentUrl = (props.videoUrl as string) || "";

  const detectProvider = (url: string): "youtube" | "vimeo" | "upload" => {
    if (!url) return "youtube";
    if (url.includes("youtube.com") || url.includes("youtu.be"))
      return "youtube";
    if (url.includes("vimeo.com")) return "vimeo";
    return "upload";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Vídeo</Label>
        {currentUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-border/50 bg-muted">
            {props.provider === "youtube" || props.provider === "vimeo" ? (
              <div className="aspect-video flex items-center justify-center">
                <FilmIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            ) : (
              <video
                src={currentUrl}
                className="w-full h-32 object-cover"
                muted
              />
            )}
            <button
              type="button"
              onClick={() => onChange({ ...props, videoUrl: "" })}
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
            <FilmIcon className="h-8 w-8 text-muted-foreground" />
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
        <Label>URL do Vídeo</Label>
        <Input
          value={currentUrl}
          onChange={(e) => {
            const newProvider = detectProvider(e.target.value);
            onChange({
              ...props,
              videoUrl: e.target.value,
              provider: newProvider,
            });
          }}
          placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
        />
        <p className="text-[11px] text-muted-foreground">
          Suporta YouTube, Vimeo ou URL direta de vídeo
        </p>
      </div>

      <div className="space-y-2">
        <Label>Provedor</Label>
        <div className="flex gap-1">
          {(["youtube", "vimeo", "upload"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...props, provider: p })}
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg py-2 text-sm transition-colors",
                (props.provider as string) === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {p === "youtube" && "YouTube"}
              {p === "vimeo" && "Vimeo"}
              {p === "upload" && "Upload"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="autoplay"
          checked={(props.autoplay as boolean) ?? false}
          onChange={(e) => onChange({ ...props, autoplay: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="autoplay" className="cursor-pointer">
          Reproduzir automaticamente
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="loop"
          checked={(props.loop as boolean) ?? false}
          onChange={(e) => onChange({ ...props, loop: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="loop" className="cursor-pointer">
          Repetir (loop)
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="muted"
          checked={(props.muted as boolean) ?? true}
          onChange={(e) => onChange({ ...props, muted: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="muted" className="cursor-pointer">
          Sem som (recomendado para autoplay)
        </Label>
      </div>

      {workspaceSlug && (
        <MediaLibrary
          open={showMediaLibrary}
          onOpenChange={setShowMediaLibrary}
          onSelect={handleAssetSelect}
          workspaceSlug={workspaceSlug}
          accept="video"
          mode="select"
        />
      )}
    </div>
  );
}
