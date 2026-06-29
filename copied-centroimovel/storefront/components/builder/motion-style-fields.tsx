"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MotionStyleFieldsProps {
  style: Record<string, unknown>;
  onChange: (style: Record<string, unknown>) => void;
}

export function MotionStyleFields({ style, onChange }: MotionStyleFieldsProps) {
  const updateStyle = (key: string, value: unknown) => {
    onChange({ ...style, [key]: value });
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-primary" />
          <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Animação de Entrada
          </Label>
        </div>

        <div className="space-y-3">
          <select
            value={(style.animation as string) || "none"}
            onChange={(e) => updateStyle("animation", e.target.value)}
            className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="none">Nenhuma</option>
            <option value="fadeIn">Fade In</option>
            <option value="fadeInUp">Fade In + Subir</option>
            <option value="fadeInDown">Fade In + Descer</option>
            <option value="slideInLeft">Deslizar Esquerda</option>
            <option value="slideInRight">Deslizar Direita</option>
            <option value="zoomIn">Zoom In</option>
            <option value="bounce">Bounce</option>
          </select>

          {(style.animation as string) !== "none" && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Duração
                  </Label>
                  <span className="text-[10px] font-mono">
                    {(style.animationDuration as number) || 500}ms
                  </span>
                </div>
                <Input
                  type="range"
                  min={100}
                  max={2000}
                  step={100}
                  value={(style.animationDuration as number) || 500}
                  onChange={(e) =>
                    updateStyle(
                      "animationDuration",
                      parseInt(e.target.value, 10),
                    )
                  }
                  className="h-1.5 cursor-pointer accent-primary"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Atraso
                  </Label>
                  <span className="text-[10px] font-mono">
                    {(style.animationDelay as number) || 0}ms
                  </span>
                </div>
                <Input
                  type="range"
                  min={0}
                  max={1000}
                  step={50}
                  value={(style.animationDelay as number) || 0}
                  onChange={(e) =>
                    updateStyle("animationDelay", parseInt(e.target.value, 10))
                  }
                  className="h-1.5 cursor-pointer accent-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-primary" />
          <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Efeito de Hover
          </Label>
        </div>

        <div className="space-y-3">
          <select
            value={(style.hoverAnimation as string) || "none"}
            onChange={(e) => updateStyle("hoverAnimation", e.target.value)}
            className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="none">Nenhum</option>
            <option value="scale">Escalar</option>
            <option value="lift">Levantar</option>
            <option value="glow">Brilho</option>
            <option value="shake">Shake</option>
          </select>

          {(style.hoverAnimation as string) === "scale" && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  Intensidade
                </Label>
                <span className="text-[10px] font-mono">
                  {(style.hoverScale as number) || 1.05}x
                </span>
              </div>
              <Input
                type="range"
                min={1}
                max={1.5}
                step={0.05}
                value={(style.hoverScale as number) || 1.05}
                onChange={(e) =>
                  updateStyle("hoverScale", parseFloat(e.target.value))
                }
                className="h-1.5 cursor-pointer accent-primary"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
