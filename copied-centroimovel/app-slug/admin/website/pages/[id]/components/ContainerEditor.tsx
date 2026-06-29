"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BackgroundSelector } from "@/modules/storefront/components/builder/BackgroundSelector";
import { MotionStyleFields } from "@/modules/storefront/components/builder/motion-style-fields";
import type { BackgroundConfig } from "@centroimovel/types";
import {
  NestedComponentsEditor,
  type NestedBlock,
} from "./NestedComponentsEditor";
import { PropsEditorRegistry } from "./PropsEditorRegistry";
import type { PropsEditorProps } from "./types";

const GAP_OPTIONS = [
  { value: "none", label: "Nenhum" },
  { value: "sm", label: "Pequeno" },
  { value: "md", label: "Médio" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra Grande" },
];

const ALIGN_OPTIONS = [
  { value: "stretch", label: "Esticar" },
  { value: "start", label: "Início" },
  { value: "center", label: "Centro" },
  { value: "end", label: "Fim" },
];

const JUSTIFY_OPTIONS = [
  { value: "start", label: "Início" },
  { value: "center", label: "Centro" },
  { value: "end", label: "Fim" },
  { value: "between", label: "Entre" },
  { value: "around", label: "Ao redor" },
];

const PADDING_OPTIONS = [
  { value: "none", label: "Nenhum" },
  { value: "sm", label: "Pequeno" },
  { value: "md", label: "Médio" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra Grande" },
  { value: "2xl", label: "2x Grande" },
];

const SHADOW_OPTIONS = [
  { value: "none", label: "Nenhum" },
  { value: "sm", label: "Pequeno" },
  { value: "md", label: "Médio" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra Grande" },
  { value: "2xl", label: "2x Forte" },
];

const BORDER_RADIUS_OPTIONS = [
  { value: "none", label: "0px" },
  { value: "sm", label: "4px" },
  { value: "md", label: "8px" },
  { value: "lg", label: "12px" },
  { value: "xl", label: "16px" },
  { value: "2xl", label: "24px" },
  { value: "full", label: "Completo" },
];

const HEIGHT_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "25vh", label: "25vh" },
  { value: "50vh", label: "50vh" },
  { value: "75vh", label: "75vh" },
  { value: "100vh", label: "100vh" },
];

interface ContainerEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
  properties?: Array<{ id: string; title: string }>;
}

export function ContainerEditor({
  props,
  onChange,
  workspaceSlug = "",
  properties,
}: ContainerEditorProps) {
  const style = (props.style as Record<string, unknown>) || {};

  const updateStyle = (key: string, value: unknown) => {
    onChange({ ...props, style: { ...style, [key]: value } });
  };

  const handleBackgroundChange = (config: BackgroundConfig) => {
    onChange({
      ...props,
      style: {
        ...style,
        background: config,
        backgroundImageUrl: undefined,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        O Container permite agrupar outros componentes em diferentes layouts.
      </div>

      <NestedComponentsEditor
        label="Conteúdo interno"
        items={((props.children as NestedBlock[]) || []).filter(Boolean)}
        onChange={(children) => onChange({ ...props, children })}
        workspaceSlug={workspaceSlug}
        renderPropsEditor={({ type, props: childProps, onChange: oc }) => (
          <PropsEditorRegistry
            type={type}
            props={childProps}
            onChange={oc}
            properties={properties}
            workspaceSlug={workspaceSlug}
          />
        )}
      />

      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Layout
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs">Tipo de Layout</Label>
          <div className="flex gap-1">
            {["stack", "grid", "flex"].map((layout) => (
              <button
                key={layout}
                type="button"
                onClick={() => onChange({ ...props, layout })}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-medium transition-colors",
                  (props.layout as string) === layout
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {layout === "stack" && "Stack"}
                {layout === "grid" && "Grid"}
                {layout === "flex" && "Flex"}
              </button>
            ))}
          </div>
        </div>

        {props.layout === "flex" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Direção</Label>
            <div className="flex gap-1">
              {["column", "row"].map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => onChange({ ...props, direction: dir })}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-medium transition-colors",
                    (props.direction as string) === dir
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  {dir === "column" ? "Vertical" : "Horizontal"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Espaçamento (gap)</Label>
          <div className="grid grid-cols-3 gap-1">
            {GAP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...props, gap: opt.value })}
                className={cn(
                  "rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                  (props.gap as string) === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Alinhamento</Label>
          <select
            value={(props.alignItems as string) || "stretch"}
            onChange={(e) => onChange({ ...props, alignItems: e.target.value })}
            className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs"
          >
            {ALIGN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Justificação</Label>
          <select
            value={(props.justifyContent as string) || "start"}
            onChange={(e) =>
              onChange({ ...props, justifyContent: e.target.value })
            }
            className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs"
          >
            {JUSTIFY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Dimensões
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs">Altura Mínima</Label>
          <div className="grid grid-cols-5 gap-1">
            {HEIGHT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...props, minHeight: opt.value })}
                className={cn(
                  "rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                  (props.minHeight as string) === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Fundo
        </Label>
        <BackgroundSelector
          value={style.background as BackgroundConfig | undefined}
          onChange={handleBackgroundChange}
          workspaceSlug={workspaceSlug}
        />
        <div className="space-y-1.5">
          <Label className="text-xs">Cor sólida (atalho)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(style.backgroundColor as string) || "#FFFFFF"}
              onChange={(e) => updateStyle("backgroundColor", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-border/50"
            />
            <Input
              value={(style.backgroundColor as string) || ""}
              onChange={(e) => updateStyle("backgroundColor", e.target.value)}
              className="flex-1 font-mono text-xs"
              placeholder="#FFFFFF"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Espaçamento
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs">Padding (espaço interno)</Label>
          <div className="grid grid-cols-3 gap-1">
            {PADDING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateStyle("padding", opt.value)}
                className={cn(
                  "rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                  (style.padding as string) === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Efeitos
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs">Sombra</Label>
          <div className="grid grid-cols-3 gap-1">
            {SHADOW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateStyle("shadow", opt.value)}
                className={cn(
                  "rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                  (style.shadow as string) === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Borda Arredondada</Label>
          <div className="grid grid-cols-3 gap-1">
            {BORDER_RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateStyle("borderRadius", opt.value)}
                className={cn(
                  "rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                  (style.borderRadius as string) === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MotionStyleFields
        style={style}
        onChange={(next) => onChange({ ...props, style: next })}
      />
    </div>
  );
}
