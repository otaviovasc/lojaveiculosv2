"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PropsEditorProps } from "./types";

const HEIGHT_OPTIONS = [
  { value: "sm", label: "Pequeno (16px)" },
  { value: "md", label: "Médio (32px)" },
  { value: "lg", label: "Grande (64px)" },
  { value: "xl", label: "Extra Grande (96px)" },
  { value: "custom", label: "Personalizado" },
];

export function SpacerEditor({ props, onChange }: PropsEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Altura do Espaço</Label>
        <div className="grid grid-cols-2 gap-2">
          {HEIGHT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...props, height: opt.value })}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                (props.height as string) === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {props.height === "custom" && (
        <div className="space-y-2">
          <Label>Altura Personalizada (px)</Label>
          <input
            type="number"
            min={16}
            max={500}
            value={(props.customHeight as number) || 100}
            onChange={(e) =>
              onChange({
                ...props,
                customHeight: parseInt(e.target.value) || 100,
              })
            }
            className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
          />
        </div>
      )}
    </div>
  );
}
