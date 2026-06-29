"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ExternalLink, FileText, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import {
  buildInternalPageUrl,
  fetchInternalPages,
  type InternalPage,
} from "./internalPageLinks";
import type { PropsEditorProps } from "./types";

interface MarqueeEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
}

export function MarqueeEditor({
  props,
  onChange,
  workspaceSlug = "",
}: MarqueeEditorProps) {
  const [internalPages, setInternalPages] = useState<InternalPage[]>([]);
  const linkType = (props.linkType as "internal" | "external") || "external";
  const linkUrl = (props.linkUrl as string) || "";

  useEffect(() => {
    if (workspaceSlug && linkType === "internal") {
      fetchInternalPages(workspaceSlug)
        .then(setInternalPages)
        .catch(console.error);
    }
  }, [workspaceSlug, linkType]);

  const handleLinkTypeChange = (type: "internal" | "external") => {
    onChange({
      ...props,
      linkType: type,
      linkUrl: type === "external" ? "https://" : "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Texto da Faixa</Label>
        <Input
          value={(props.text as string) || ""}
          onChange={(e) => onChange({ ...props, text: e.target.value })}
          placeholder="Texto que vai passar na tela..."
        />
      </div>

      <div className="space-y-2">
        <Label>Velocidade</Label>
        <div className="flex gap-1">
          {[
            { value: "slow", label: "Lento" },
            { value: "normal", label: "Normal" },
            { value: "fast", label: "Rápido" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...props, speed: opt.value })}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                (props.speed as string) === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Direção</Label>
        <div className="flex gap-1">
          {[
            { value: "left", label: "← Esquerda" },
            { value: "right", label: "Direita →" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...props, direction: opt.value })}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                (props.direction as string) === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Texto do Link (opcional)</Label>
        <Input
          value={(props.linkText as string) || ""}
          onChange={(e) => onChange({ ...props, linkText: e.target.value })}
          placeholder="Ver mais"
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
              linkType === "internal"
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
              linkType === "external"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80",
            )}
          >
            <Globe className="h-4 w-4" />
            Link Externo
          </button>
        </div>
      </div>

      {linkType === "internal" ? (
        <div className="space-y-2">
          <Label>Página de Destino</Label>
          <select
            value={linkUrl}
            onChange={(e) => onChange({ ...props, linkUrl: e.target.value })}
            className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
          >
            <option value="">Selecione uma página...</option>
            {linkUrl &&
              !internalPages.some(
                (page) =>
                  buildInternalPageUrl(
                    workspaceSlug,
                    page.slug,
                    page.visible ? undefined : page.secretToken,
                  ) === linkUrl,
              ) && <option value={linkUrl}>{linkUrl}</option>}
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
          <Label>URL do Link (opcional)</Label>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={linkUrl}
              onChange={(e) => onChange({ ...props, linkUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
