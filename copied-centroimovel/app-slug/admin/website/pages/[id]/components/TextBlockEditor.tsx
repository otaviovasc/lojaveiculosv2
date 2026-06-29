"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { StyleEditor } from "@/modules/storefront/components/builder/StyleEditor";
import {
  TextBlockMarkdown,
  type TextBlockTextAlign,
} from "@/modules/storefront/components/builder/TextBlockMarkdown";
import {
  defaultTextColorForTextBlock,
  relativeLuminance,
  solidBackgroundHexFromStyle,
} from "@/modules/storefront/components/builder/text-block-colors";
import type { ComponentStyleProps } from "@centroimovel/types";
import { useMemo, useState } from "react";
import type { PropsEditorProps } from "./types";

type TabId = "conteudo" | "personalizar";
type PreviewSurface = "auto" | "light" | "dark";

interface TextBlockEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
}

const MD_COLOR_KEYS = [
  ["headingColor", "Título (# h1)", "#0c0a09"],
  ["subheadingColor", "Subtítulo (## / ###)", "#57534e"],
  ["bodyTextColor", "Parágrafos e corpo", "#44403c"],
  ["listTextColor", "Listas (-, 1.)", "#44403c"],
  ["linkTextColor", "Links", "#0369a1"],
  ["codeTextColor", "Código (`…`)", "#57534e"],
] as const;

function MarkdownSyntaxGuide() {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
      <p className="mb-2 font-medium text-foreground">Formatação Markdown</p>
      <ul className="list-inside list-disc space-y-1">
        <li>Uma quebra de linha vira nova linha no site (como no editor).</li>
        <li>
          <code className="rounded bg-muted px-1"># Título</code>,{" "}
          <code className="rounded bg-muted px-1">## Subtítulo</code>
        </li>
        <li>
          <code className="rounded bg-muted px-1">**negrito**</code>,{" "}
          <code className="rounded bg-muted px-1">*itálico*</code>
        </li>
        <li>
          Listas: linhas com <code className="rounded bg-muted px-1">-</code> ou{" "}
          <code className="rounded bg-muted px-1">1.</code>
        </li>
        <li>
          <code className="rounded bg-muted px-1">[rótulo](https://…)</code>{" "}
          para links
        </li>
        <li>
          <code className="rounded bg-muted px-1">&gt; citação</code>,{" "}
          <code className="rounded bg-muted px-1">`código`</code>, tabelas (GFM)
        </li>
      </ul>
      <p className="mt-2 text-[10px]">
        As cores por tipo (título, lista, etc.) ficam em{" "}
        <span className="font-medium text-foreground">Cores do Markdown</span>{" "}
        abaixo.
      </p>
    </div>
  );
}

export function TextBlockEditor({
  props,
  onChange,
  workspaceSlug,
}: TextBlockEditorProps) {
  const [tab, setTab] = useState<TabId>("conteudo");
  const [previewSurface, setPreviewSurface] = useState<PreviewSurface>("auto");
  const style = (props.style as Record<string, unknown>) || {};
  const typedStyle = props.style as ComponentStyleProps | undefined;

  const markdownColors = useMemo(
    () => ({
      headingColor: props.headingColor as string | undefined,
      subheadingColor: props.subheadingColor as string | undefined,
      bodyTextColor: props.bodyTextColor as string | undefined,
      listTextColor: props.listTextColor as string | undefined,
      linkTextColor: props.linkTextColor as string | undefined,
      codeTextColor: props.codeTextColor as string | undefined,
    }),
    [
      props.headingColor,
      props.subheadingColor,
      props.bodyTextColor,
      props.listTextColor,
      props.linkTextColor,
      props.codeTextColor,
    ],
  );

  const basePreview =
    typedStyle?.textColor ?? defaultTextColorForTextBlock(typedStyle);
  const sectionBg = solidBackgroundHexFromStyle(typedStyle);
  const invertFromSection =
    sectionBg !== undefined && relativeLuminance(sectionBg) <= 0.45;
  const invertPreview =
    previewSurface === "dark"
      ? true
      : previewSurface === "light"
        ? false
        : invertFromSection;
  const alignPreview =
    (props.alignment as TextBlockTextAlign | undefined) || "left";

  const patchMarkdownColor = (
    key: (typeof MD_COLOR_KEYS)[number][0],
    raw: string,
  ) => {
    const t = raw.trim();
    if (t === "") {
      onChange({ ...props, [key]: undefined });
      return;
    }
    if (/^#[0-9a-fA-F]{6}$/i.test(t)) {
      onChange({ ...props, [key]: t.toLowerCase() });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg border border-border/50 bg-muted/20 p-0.5">
        {(
          [
            ["conteudo", "Conteúdo"],
            ["personalizar", "Personalizar"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-md py-2 text-xs font-medium transition-colors",
              tab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "conteudo" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Conteúdo (Markdown)</Label>
            <Textarea
              value={(props.content as string) || ""}
              onChange={(e) => onChange({ ...props, content: e.target.value })}
              placeholder="Use Markdown: títulos, listas, negrito…"
              rows={10}
              className="font-mono text-xs leading-relaxed"
            />
          </div>
          <div className="space-y-2">
            <Label>Alinhamento</Label>
            <div className="flex gap-1">
              {["left", "center", "right"].map((align) => (
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
          <div className="space-y-2">
            <Label>Largura Máxima</Label>
            <select
              value={(props.maxWidth as string) || "md"}
              onChange={(e) => onChange({ ...props, maxWidth: e.target.value })}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
            >
              <option value="sm">Pequena (640px)</option>
              <option value="md">Média (800px)</option>
              <option value="lg">Grande (1000px)</option>
              <option value="full">Total</option>
            </select>
          </div>
        </div>
      )}

      {tab === "personalizar" && (
        <div className="space-y-4">
          <MarkdownSyntaxGuide />

          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-3">
            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
              Cores do Markdown
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Base padrão: cor do texto em Tipografia (Estilo). Aqui você
              sobrescreve por tipo de elemento.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MD_COLOR_KEYS.map(([key, label, fallback]) => {
                const cur = props[key] as string | undefined;
                const picker =
                  cur && /^#[0-9a-fA-F]{6}$/i.test(cur) ? cur : fallback;
                return (
                  <div key={key} className="space-y-1">
                    <Label className="text-[11px]">{label}</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={picker}
                        onChange={(e) =>
                          patchMarkdownColor(key, e.target.value)
                        }
                        className="h-8 w-9 shrink-0 cursor-pointer rounded border border-border/50"
                      />
                      <Input
                        key={`${key}-${cur ?? ""}`}
                        defaultValue={cur ?? ""}
                        onBlur={(e) => patchMarkdownColor(key, e.target.value)}
                        placeholder={fallback}
                        className="h-8 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Pré-visualização</Label>
            <p className="text-[10px] text-muted-foreground">
              Reflete títulos, listas, negrito e cores configuradas acima.
              Escolha o fundo do quadro para checar contraste em tema claro ou
              escuro.
            </p>
            <div className="flex gap-1 rounded-lg border border-border/50 bg-muted/20 p-0.5">
              {(
                [
                  ["auto", "Automático"],
                  ["light", "Claro"],
                  ["dark", "Escuro"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreviewSurface(id)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-[10px] font-medium transition-colors",
                    previewSurface === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className={cn(
                "max-h-56 overflow-y-auto rounded-lg border p-3 text-left shadow-sm",
                previewSurface === "dark" ||
                  (previewSurface === "auto" && invertPreview)
                  ? "border-zinc-700 bg-zinc-950 text-zinc-50"
                  : "border-stone-200 bg-white text-stone-900",
              )}
            >
              {(props.content as string)?.trim() ? (
                <TextBlockMarkdown
                  content={(props.content as string) || ""}
                  invert={invertPreview}
                  textAlign={alignPreview}
                  baseTextColor={basePreview}
                  markdownColors={markdownColors}
                  className="text-sm md:text-base"
                />
              ) : (
                <p
                  className={cn(
                    "text-xs",
                    previewSurface === "dark" ||
                      (previewSurface === "auto" && invertPreview)
                      ? "text-zinc-400"
                      : "text-muted-foreground",
                  )}
                >
                  Escreva o conteúdo na aba Conteúdo para ver o preview aqui.
                </p>
              )}
            </div>
          </div>
          <StyleEditor
            style={style}
            onChange={(newStyle) => onChange({ ...props, style: newStyle })}
            workspaceSlug={workspaceSlug}
            componentType="text_block"
          />
        </div>
      )}
    </div>
  );
}
