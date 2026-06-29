"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PropsEditorProps } from "./types";

const DIVIDER_STYLES = [
  { value: "solid", label: "Sólida" },
  { value: "dashed", label: "Tracejada" },
  { value: "dotted", label: "Pontilhada" },
  { value: "gradient", label: "Gradiente" },
] as const;

export function DividerEditor({ props, onChange }: PropsEditorProps) {
  const legacy = props.style;
  const lineVariant =
    (props.lineVariant as string) ||
    (typeof legacy === "string" ? legacy : "solid");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Estilo da linha</Label>
        <div className="grid grid-cols-2 gap-2">
          {DIVIDER_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const next = { ...props, lineVariant: opt.value };
                if ("style" in next)
                  delete (next as Record<string, unknown>).style;
                onChange(next);
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                lineVariant === opt.value
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
        <Label>Texto (opcional)</Label>
        <Input
          value={(props.text as string) || ""}
          onChange={(e) => onChange({ ...props, text: e.target.value })}
          placeholder="Texto central"
        />
      </div>
      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(props.color as string) || "#E5E7EB"}
            onChange={(e) => onChange({ ...props, color: e.target.value })}
            className="h-9 w-9 cursor-pointer rounded-lg border border-border/50"
          />
          <Input
            value={(props.color as string) || ""}
            onChange={(e) => onChange({ ...props, color: e.target.value })}
            className="h-9 flex-1 font-mono text-xs"
            placeholder="#E5E7EB"
          />
        </div>
      </div>
    </div>
  );
}
