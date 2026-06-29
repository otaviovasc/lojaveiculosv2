"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BackgroundSelector } from "@/modules/storefront/components/builder";
import { MotionStyleFields } from "@/modules/storefront/components/builder/motion-style-fields";
import type { BackgroundConfig } from "@centroimovel/types";
import {
  NestedComponentsEditor,
  type NestedBlock,
} from "./NestedComponentsEditor";
import { PropsEditorRegistry } from "./PropsEditorRegistry";
import type { PropsEditorProps } from "./types";

const WIDTH_OPTIONS = [
  { value: "sm", label: "Pequeno (640px)" },
  { value: "md", label: "Médio (768px)" },
  { value: "lg", label: "Grande (1024px)" },
  { value: "xl", label: "Extra Grande (1280px)" },
  { value: "2xl", label: "2x Grande (1536px)" },
  { value: "full", label: "Total" },
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

interface SectionWrapperEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
  properties?: Array<{ id: string; title: string }>;
}

export function SectionWrapperEditor({
  props,
  onChange,
  workspaceSlug = "",
  properties,
}: SectionWrapperEditorProps) {
  const style = (props.style as Record<string, unknown>) || {};
  const fullWidth = (props.fullWidth as boolean) ?? false;

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
        Container que envolve outros componentes com controle de largura máxima.
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="fullWidth"
            checked={fullWidth}
            onChange={(e) =>
              onChange({ ...props, fullWidth: e.target.checked })
            }
            className="h-4 w-4 rounded"
          />
          <Label htmlFor="fullWidth" className="text-sm cursor-pointer">
            Largura total (100%)
          </Label>
        </div>

        {!fullWidth && (
          <div className="space-y-1.5">
            <Label className="text-xs">Largura Máxima</Label>
            <select
              value={(props.maxWidth as string) || "lg"}
              onChange={(e) => onChange({ ...props, maxWidth: e.target.value })}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
            >
              {WIDTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
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

        <div className="space-y-1.5">
          <Label className="text-xs">Margin (espaço externo)</Label>
          <div className="grid grid-cols-3 gap-1">
            {PADDING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateStyle("margin", opt.value)}
                className={cn(
                  "rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                  (style.margin as string) === opt.value
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

        <div className="space-y-1.5">
          <Label className="text-xs">Espessura da Borda</Label>
          <Input
            type="number"
            min={0}
            max={10}
            value={(style.borderWidth as number) || 0}
            onChange={(e) =>
              updateStyle("borderWidth", parseInt(e.target.value) || 0)
            }
            className="h-9 text-xs"
            placeholder="0"
          />
        </div>

        {(style.borderWidth as number) > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Cor da Borda</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(style.borderColor as string) || "#E5E7EB"}
                onChange={(e) => updateStyle("borderColor", e.target.value)}
                className="h-9 w-12 rounded-lg cursor-pointer border border-border/50"
              />
              <Input
                value={(style.borderColor as string) || ""}
                onChange={(e) => updateStyle("borderColor", e.target.value)}
                className="flex-1 font-mono text-xs"
                placeholder="#E5E7EB"
              />
            </div>
          </div>
        )}
      </div>

      <MotionStyleFields
        style={style}
        onChange={(next) => onChange({ ...props, style: next })}
      />
    </div>
  );
}
