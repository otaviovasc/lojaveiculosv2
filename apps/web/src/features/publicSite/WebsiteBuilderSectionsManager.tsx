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
  all_properties: "Todos os Veiculos",
  contact: "Contato",
  cta: "Chamada para Acao",
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

  const toggleVisibility = (id: string) => {
    onUpdate(
      sections.map((section) =>
        section.id === id ? { ...section, visible: !section.visible } : section,
      ),
    );
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
      <div className="space-y-1">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ordem e Visibilidade
        </Label>
        <p className="text-xs text-muted-foreground">
          Reordene com os botoes e oculte secoes que nao deseja exibir.
        </p>
      </div>
      <div className="space-y-2">
        {sorted.map((section, index) => (
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
              section.visible
                ? "border-border/60 bg-card shadow-sm"
                : "border-border/40 bg-muted/20 opacity-70",
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
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  section.visible
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-muted",
                )}
                onClick={() => toggleVisibility(section.id)}
                title={section.visible ? "Ocultar secao" : "Mostrar secao"}
                type="button"
              >
                {section.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
              <button
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                disabled={index === 0}
                onClick={() => moveSection(index, -1)}
                title="Mover para cima"
                type="button"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
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
