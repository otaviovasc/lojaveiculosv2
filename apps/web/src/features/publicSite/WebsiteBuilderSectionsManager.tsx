import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WebsiteBuilderSection } from "./WebsiteBuilderTypes";

const sectionLabels: Record<string, string> = {
  about: "Sobre",
  all_properties: "Todos os Veículos",
  contact: "Contato",
  cta: "Chamada para Ação",
  featured: "Destaques",
  hero: "Capa (Hero)",
  map: "Mapa",
  search: "Busca",
  testimonials: "Depoimentos",
};

export function WebsiteBuilderSectionsManager({
  onUpdate,
  sections,
}: {
  onUpdate: (sections: WebsiteBuilderSection[]) => void;
  sections: WebsiteBuilderSection[];
}) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const visibleCount = sorted.filter((s) => s.visible).length;

  const toggleVisibility = (id: string) => {
    onUpdate(
      sections.map((section) =>
        section.id === id ? { ...section, visible: !section.visible } : section,
      ),
    );
  };

  const setAllVisibility = (visible: boolean) => {
    onUpdate(sections.map((section) => ({ ...section, visible })));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sorted.length) return;
    const reordered = [...sorted];
    const [removed] = reordered.splice(index, 1);
    if (!removed) return;
    reordered.splice(nextIndex, 0, removed);
    onUpdate(reordered.map((section, order) => ({ ...section, order })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ordem e Visibilidade
          </Label>
          <p className="text-xs text-muted-foreground">
            {visibleCount} de {sorted.length} seções visíveis
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => setAllVisibility(true)}
            type="button"
          >
            Exibir todas
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {sorted.map((section, index) => (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all",
              section.visible
                ? "border-border/40 bg-card/60"
                : "border-border/30 bg-muted/20 opacity-60",
            )}
            key={section.id}
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
              {sectionLabels[section.type] ?? section.type}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label={
                  section.visible
                    ? `Ocultar seção ${sectionLabels[section.type] ?? section.type}`
                    : `Mostrar seção ${sectionLabels[section.type] ?? section.type}`
                }
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  section.visible
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-secondary",
                )}
                onClick={() => toggleVisibility(section.id)}
                title={section.visible ? "Ocultar seção" : "Mostrar seção"}
                type="button"
              >
                {section.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
              <button
                aria-label={`Mover seção ${sectionLabels[section.type] ?? section.type} para cima`}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                disabled={index === 0}
                onClick={() => moveSection(index, -1)}
                title="Mover para cima"
                type="button"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                aria-label={`Mover seção ${sectionLabels[section.type] ?? section.type} para baixo`}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                disabled={index === sorted.length - 1}
                onClick={() => moveSection(index, 1)}
                title="Mover para baixo"
                type="button"
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
