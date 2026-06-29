"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";

const SECTION_LABELS: Record<string, string> = {
  hero: "Capa (Hero)",
  search: "Busca",
  featured: "Destaques",
  all_properties: "Todos os Imóveis",
  about: "Sobre",
  testimonials: "Depoimentos",
  contact: "Contato",
  map: "Mapa",
  cta: "Chamada para Ação",
};

interface SectionsManagerProps {
  sections: Array<{
    id: string;
    type: string;
    visible: boolean;
    order: number;
  }>;
  onUpdate: (
    sections: Array<{
      id: string;
      type: string;
      visible: boolean;
      order: number;
    }>,
  ) => void;
}

export function SectionsManager({ sections, onUpdate }: SectionsManagerProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  const toggleVisibility = (id: string) => {
    const updated = sections.map((s) =>
      s.id === id ? { ...s, visible: !s.visible } : s,
    );
    onUpdate(updated);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sorted.length) return;

    const reordered = [...sorted];
    const [removed] = reordered.splice(index, 1);
    if (!removed) return;
    reordered.splice(newIndex, 0, removed);

    // Reassign order values
    const updated = reordered.map((s, i) => ({ ...s, order: i }));
    onUpdate(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ordem e Visibilidade
        </Label>
        <p className="text-xs text-muted-foreground">
          Arraste visualmente ou use os botões para reordenar. Oculte seções que
          não deseja exibir.
        </p>
      </div>
      <div className="space-y-2">
        {sorted.map((section, index) => (
          <div
            key={section.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
              section.visible
                ? "border-border/60 bg-card shadow-sm"
                : "border-border/40 bg-muted/20 opacity-70",
            )}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />

            <span
              className={cn(
                "min-w-0 flex-1 text-sm font-medium",
                section.visible
                  ? "text-foreground"
                  : "text-muted-foreground line-through",
              )}
            >
              {SECTION_LABELS[section.type] ?? section.type}
            </span>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => toggleVisibility(section.id)}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  section.visible
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-muted",
                )}
                title={section.visible ? "Ocultar seção" : "Mostrar seção"}
              >
                {section.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => moveSection(index, -1)}
                disabled={index === 0}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                title="Mover para cima"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveSection(index, 1)}
                disabled={index === sorted.length - 1}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                title="Mover para baixo"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
