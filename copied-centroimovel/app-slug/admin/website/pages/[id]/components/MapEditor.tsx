"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PropsEditorProps } from "./types";

export function MapEditor({ props, onChange }: PropsEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input
          value={(props.address as string) || ""}
          onChange={(e) => onChange({ ...props, address: e.target.value })}
          placeholder="Rua exemplo, 123 - Cidade"
        />
      </div>
      <div className="space-y-2">
        <Label>Latitude</Label>
        <Input
          type="number"
          step="any"
          value={(props.latitude as number) || ""}
          onChange={(e) =>
            onChange({
              ...props,
              latitude:
                e.target.value === "" ? undefined : parseFloat(e.target.value),
            })
          }
          placeholder="-23.5505"
        />
      </div>
      <div className="space-y-2">
        <Label>Longitude</Label>
        <Input
          type="number"
          step="any"
          value={(props.longitude as number) || ""}
          onChange={(e) =>
            onChange({
              ...props,
              longitude:
                e.target.value === "" ? undefined : parseFloat(e.target.value),
            })
          }
          placeholder="-46.6333"
        />
      </div>
      <div className="space-y-2">
        <Label>Zoom</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={(props.zoom as number) || 15}
          onChange={(e) =>
            onChange({ ...props, zoom: parseInt(e.target.value) || 15 })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          Valor entre 1 (visão global) e 20 (visão detalhada)
        </p>
      </div>
    </div>
  );
}
