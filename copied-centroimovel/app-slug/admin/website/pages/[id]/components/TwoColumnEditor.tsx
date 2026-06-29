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

const PADDING_OPTIONS = [
  { value: "none", label: "Nenhum" },
  { value: "sm", label: "Pequeno" },
  { value: "md", label: "Médio" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra Grande" },
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

interface TwoColumnEditorProps extends PropsEditorProps {
  workspaceSlug?: string;
  properties?: Array<{ id: string; title: string }>;
}

export function TwoColumnEditor({
  props,
  onChange,
  workspaceSlug = "",
  properties,
}: TwoColumnEditorProps) {
  const style = (props.style as Record<string, unknown>) || {};
  const leftStyle = (props.leftStyle as Record<string, unknown>) || {};
  const rightStyle = (props.rightStyle as Record<string, unknown>) || {};
  const leftWidth = (props.leftColumnWidth as number) || 50;
  const rightWidth = 100 - leftWidth;

  const updateStyle = (
    key: string,
    value: unknown,
    target: "main" | "left" | "right" = "main",
  ) => {
    if (target === "left") {
      onChange({ ...props, leftStyle: { ...leftStyle, [key]: value } });
    } else if (target === "right") {
      onChange({ ...props, rightStyle: { ...rightStyle, [key]: value } });
    } else {
      onChange({ ...props, style: { ...style, [key]: value } });
    }
  };

  const handleMainBackgroundChange = (config: BackgroundConfig) => {
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
        Layout de duas colunas com largura customizável.
      </div>

      <NestedComponentsEditor
        label="Coluna esquerda (blocos)"
        items={((props.leftChildren as NestedBlock[]) || []).filter(Boolean)}
        onChange={(leftChildren) => onChange({ ...props, leftChildren })}
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
      <NestedComponentsEditor
        label="Coluna direita (blocos)"
        items={((props.rightChildren as NestedBlock[]) || []).filter(Boolean)}
        onChange={(rightChildren) => onChange({ ...props, rightChildren })}
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
          Colunas
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs">
            Proporção: {leftWidth}% / {rightWidth}%
          </Label>
          <input
            type="range"
            min={20}
            max={80}
            value={leftWidth}
            onChange={(e) =>
              onChange({
                ...props,
                leftColumnWidth: parseInt(e.target.value),
                rightColumnWidth: 100 - parseInt(e.target.value),
              })
            }
            className="h-2 w-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Esquerda: {leftWidth}%</span>
            <span>Direita: {rightWidth}%</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Espaçamento entre Colunas</Label>
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reverseOnMobile"
            checked={(props.reverseOnMobile as boolean) ?? false}
            onChange={(e) =>
              onChange({ ...props, reverseOnMobile: e.target.checked })
            }
            className="h-4 w-4 rounded"
          />
          <Label htmlFor="reverseOnMobile" className="text-sm cursor-pointer">
            Inverter ordem no mobile
          </Label>
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Fundo da seção
        </Label>
        <BackgroundSelector
          value={style.background as BackgroundConfig | undefined}
          onChange={handleMainBackgroundChange}
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

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Estilo das Colunas
        </Label>
        {[
          { key: "left", label: "Coluna Esquerda", style: leftStyle },
          { key: "right", label: "Coluna Direita", style: rightStyle },
        ].map((column) => (
          <div key={column.key} className="space-y-2 rounded-lg border p-3">
            <Label className="text-xs font-medium">{column.label}</Label>
            <div className="space-y-1.5">
              <Label className="text-xs">Fundo completo</Label>
              <BackgroundSelector
                value={column.style.background as BackgroundConfig | undefined}
                onChange={(config) => {
                  if (column.key === "left") {
                    onChange({
                      ...props,
                      leftStyle: {
                        ...leftStyle,
                        background: config,
                        backgroundImageUrl: undefined,
                      },
                    });
                  } else {
                    onChange({
                      ...props,
                      rightStyle: {
                        ...rightStyle,
                        background: config,
                        backgroundImageUrl: undefined,
                      },
                    });
                  }
                }}
                workspaceSlug={workspaceSlug}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor sólida (atalho)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(column.style.backgroundColor as string) || "#FFFFFF"}
                  onChange={(e) =>
                    updateStyle(
                      "backgroundColor",
                      e.target.value,
                      column.key as "left" | "right",
                    )
                  }
                  className="h-9 w-12 cursor-pointer rounded-lg border border-border/50"
                />
                <Input
                  value={(column.style.backgroundColor as string) || ""}
                  onChange={(e) =>
                    updateStyle(
                      "backgroundColor",
                      e.target.value,
                      column.key as "left" | "right",
                    )
                  }
                  className="flex-1 font-mono text-xs"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Padding</Label>
              <div className="grid grid-cols-3 gap-1">
                {PADDING_OPTIONS.map((opt) => (
                  <button
                    key={`${column.key}-${opt.value}`}
                    type="button"
                    onClick={() =>
                      updateStyle(
                        "padding",
                        opt.value,
                        column.key as "left" | "right",
                      )
                    }
                    className={cn(
                      "rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                      (column.style.padding as string) === opt.value
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
        ))}
      </div>

      <MotionStyleFields
        style={style}
        onChange={(next) => onChange({ ...props, style: next })}
      />
    </div>
  );
}
