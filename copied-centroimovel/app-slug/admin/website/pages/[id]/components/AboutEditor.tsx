"use client";

import {
  MediaLibrary,
  type MediaAsset,
} from "@/components/MediaLibrary/MediaLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Upload, X } from "lucide-react";
import { useState } from "react";
import type { PropsEditorProps } from "./types";

interface AboutEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
}

export function AboutEditor({
  props,
  onChange,
  workspaceSlug = "",
}: AboutEditorProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const handleAssetSelect = (asset: MediaAsset) => {
    onChange({ ...props, imageUrl: asset.url });
    setShowMediaLibrary(false);
  };

  const imageUrl = (props.imageUrl as string) || "";

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
        <Label>Título</Label>
        <Input
          value={(props.title as string) || ""}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          placeholder="Sobre Nós"
        />
      </div>

      <div className="space-y-2">
        <Label>Texto</Label>
        <Textarea
          value={(props.text as string) || ""}
          onChange={(e) => onChange({ ...props, text: e.target.value })}
          placeholder="Descrição sobre você..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Posição da Imagem</Label>
        <select
          value={(props.imagePosition as string) || "right"}
          onChange={(e) =>
            onChange({ ...props, imagePosition: e.target.value })
          }
          className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
        >
          <option value="left">Esquerda</option>
          <option value="right">Direita</option>
        </select>
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
