"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useState } from "react";
import type { PropsEditorProps } from "./types";

interface PropertyItem {
  id: string;
  title: string;
}

interface PropertyGridEditorProps extends PropsEditorProps {
  properties?: PropertyItem[];
}

export function PropertyGridEditor({
  props,
  onChange,
  properties = [],
}: PropertyGridEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const propertyIds = (props.propertyIds as string[]) || [];

  const toggleProperty = (propertyId: string) => {
    const isSelected = propertyIds.includes(propertyId);
    if (isSelected) {
      onChange({
        ...props,
        propertyIds: propertyIds.filter((id) => id !== propertyId),
      });
    } else {
      onChange({ ...props, propertyIds: [...propertyIds, propertyId] });
    }
  };

  const selectAll = () => {
    onChange({ ...props, propertyIds: properties.map((p) => p.id) });
  };

  const clearAll = () => {
    onChange({ ...props, propertyIds: [] });
  };

  const filteredProperties = properties.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input
          value={(props.title as string) || ""}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          placeholder="Imóveis em Destaque"
        />
      </div>
      <div className="space-y-2">
        <Label>Subtítulo</Label>
        <Input
          value={(props.subtitle as string) || ""}
          onChange={(e) => onChange({ ...props, subtitle: e.target.value })}
          placeholder="Confira nossa seleção"
        />
      </div>
      <div className="space-y-2">
        <Label>Quantidade Máxima</Label>
        <Input
          type="number"
          min={1}
          max={12}
          value={(props.maxProperties as number) || 6}
          onChange={(e) =>
            onChange({ ...props, maxProperties: parseInt(e.target.value) || 6 })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Layout</Label>
        <div className="flex gap-1">
          {["grid", "carousel"].map((layout) => (
            <button
              key={layout}
              type="button"
              onClick={() => onChange({ ...props, layout })}
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg py-2 text-sm transition-colors",
                (props.layout as string) === layout
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {layout === "grid" ? "Grid" : "Carrossel"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showAllLink"
          checked={(props.showAllLink as boolean) ?? false}
          onChange={(e) =>
            onChange({ ...props, showAllLink: e.target.checked })
          }
        />
        <Label htmlFor="showAllLink">Mostrar link &quot;Ver todos&quot;</Label>
      </div>

      {properties.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Imóveis Selecionados ({propertyIds.length})</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar imóveis..."
              className="pl-8 h-8.5 text-xs rounded-lg"
            />
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-2 custom-scrollbar">
            {filteredProperties.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhum imóvel encontrado
              </div>
            ) : (
              filteredProperties.map((property) => (
                <label
                  key={property.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={propertyIds.includes(property.id)}
                    onChange={() => toggleProperty(property.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{property.title}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
