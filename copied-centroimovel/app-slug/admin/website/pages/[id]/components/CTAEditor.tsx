"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronDown, ExternalLink, FileText, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildInternalPageUrl,
  fetchInternalPages,
  type InternalPage,
} from "./internalPageLinks";
import type { PropsEditorProps } from "./types";

interface CTAEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
}

export function CTAEditor({
  props,
  onChange,
  workspaceSlug = "",
}: CTAEditorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [internalPages, setInternalPages] = useState<InternalPage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const linkType =
    (props.buttonLinkType as "internal" | "external") || "internal";
  const buttonUrl = (props.buttonUrl as string) || "";
  const buttonLabel = (props.buttonLabel as string) || "";

  useEffect(() => {
    if (workspaceSlug && linkType === "internal") {
      fetchInternalPages(workspaceSlug)
        .then(setInternalPages)
        .catch(console.error);
    }
  }, [workspaceSlug, linkType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showDropdown &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const filteredPages = internalPages.filter(
    (page) =>
      page.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const getPageUrl = (page: InternalPage) =>
    buildInternalPageUrl(
      workspaceSlug,
      page.slug,
      page.visible ? undefined : page.secretToken,
    );
  const selectedPage = internalPages.find(
    (page) => getPageUrl(page) === buttonUrl,
  );

  const handleLinkTypeChange = (type: "internal" | "external") => {
    onChange({
      ...props,
      buttonLinkType: type,
      buttonUrl: type === "external" ? "https://" : "",
    });
  };

  const handlePageSelect = (page: InternalPage) => {
    onChange({ ...props, buttonUrl: getPageUrl(page) });
    setShowDropdown(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input
          value={(props.title as string) || ""}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          placeholder="Pronto para começar?"
        />
      </div>
      <div className="space-y-2">
        <Label>Subtítulo</Label>
        <Input
          value={(props.subtitle as string) || ""}
          onChange={(e) => onChange({ ...props, subtitle: e.target.value })}
          placeholder="Entre em contato conosco hoje"
        />
      </div>
      <div className="space-y-2">
        <Label>Texto do Botão</Label>
        <Input
          value={buttonLabel}
          onChange={(e) => onChange({ ...props, buttonLabel: e.target.value })}
          placeholder="Fale Conosco"
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
          <Label>Selecionar Página</Label>
          <div className="relative" ref={dropdownRef}>
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors",
                showDropdown ? "ring-2 ring-primary" : "",
              )}
            >
              <span className={buttonUrl ? "" : "text-muted-foreground"}>
                {buttonUrl
                  ? selectedPage
                    ? `${selectedPage.label}${
                        selectedPage.visible ? "" : " (Rascunho)"
                      }`
                    : buttonUrl
                  : "Selecione uma página..."}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showDropdown ? "rotate-180" : "",
                )}
              />
            </button>

            {showDropdown &&
              buttonRef.current &&
              createPortal(
                <div
                  className="fixed z-[9999] w-[300px] rounded-lg border bg-popover shadow-lg overflow-hidden"
                  style={{
                    top: buttonRef.current.getBoundingClientRect().bottom + 4,
                    left: buttonRef.current.getBoundingClientRect().left,
                  }}
                  ref={dropdownRef}
                >
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Buscar páginas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredPages.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                        Nenhuma página encontrada
                      </div>
                    ) : (
                      filteredPages.map((page) => (
                        <button
                          key={page.slug}
                          type="button"
                          onClick={() => handlePageSelect(page)}
                          className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium text-sm">
                            {page.visible
                              ? page.label
                              : `${page.label} (Rascunho)`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getPageUrl(page)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>,
                document.body,
              )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            ou digite uma URL manual:{" "}
            <span
              className="text-primary cursor-pointer hover:underline"
              onClick={() => handleLinkTypeChange("external")}
            >
              usar link externo
            </span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>URL Externa</Label>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={buttonUrl}
              onChange={(e) =>
                onChange({ ...props, buttonUrl: e.target.value })
              }
              placeholder="https://exemplo.com"
              type="url"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            URL completa incluindo https://
          </p>
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
                "flex flex-1 items-center justify-center rounded-lg py-2 text-sm transition-colors",
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
    </div>
  );
}
