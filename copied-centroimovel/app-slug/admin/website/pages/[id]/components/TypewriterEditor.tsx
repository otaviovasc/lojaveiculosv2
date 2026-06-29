"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Plus, Type as TypeIcon, X } from "lucide-react";
import type { PropsEditorProps } from "./types";

type TypewriterEditorProps = PropsEditorProps;

const FONT_SIZE_OPTIONS = [
  { value: "sm", label: "Pequeno", className: "text-lg sm:text-xl" },
  { value: "md", label: "Médio", className: "text-2xl sm:text-3xl" },
  { value: "lg", label: "Grande", className: "text-3xl sm:text-4xl" },
  { value: "xl", label: "Extra Grande", className: "text-4xl sm:text-5xl" },
  { value: "2xl", label: "Hero", className: "text-5xl sm:text-7xl" },
];

export function TypewriterEditor({ props, onChange }: TypewriterEditorProps) {
  const texts: string[] = (props.texts as string[]) || ["Texto 1", "Texto 2"];
  const speed = (props.speed as number) || 70;
  const initialDelay = (props.initialDelay as number) || 0;
  const waitTime = (props.waitTime as number) || 2000;
  const deleteSpeed = (props.deleteSpeed as number) || 40;
  const loop = (props.loop as boolean) ?? true;
  const showCursor = (props.showCursor as boolean) ?? true;
  const cursorChar = (props.cursorChar as string) || "_";
  const preText = (props.preText as string) || "";
  const postText = (props.postText as string) || "";
  const textPosition =
    (props.textPosition as "center" | "left" | "right") || "center";
  const staticTextColor = (props.staticTextColor as string) || "#1A1A1A";
  const typewriterColor = (props.typewriterColor as string) || "#C9A84C";
  const fontSize = (props.fontSize as string) || "2xl";
  const bigText = (props.bigText as boolean) ?? true;

  const addText = () => {
    onChange({ ...props, texts: [...texts, `Novo texto ${texts.length + 1}`] });
  };

  const removeText = (index: number) => {
    if (texts.length > 1) {
      onChange({ ...props, texts: texts.filter((_, i) => i !== index) });
    }
  };

  const updateText = (index: number, value: string) => {
    const newTexts = [...texts];
    newTexts[index] = value;
    onChange({ ...props, texts: newTexts });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Textos para alternar</Label>
        <p className="text-[10px] text-muted-foreground">
          Adicione vários textos que vão se alternar
        </p>

        <div className="space-y-2">
          {texts.map((text, index) => (
            <div key={index} className="flex items-center gap-2">
              <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Textarea
                value={text}
                onChange={(e) => updateText(index, e.target.value)}
                placeholder="Digite o texto..."
                className="flex-1 text-xs min-h-[60px]"
                rows={2}
              />
              <button
                type="button"
                onClick={() => removeText(index)}
                disabled={texts.length <= 1}
                className={cn(
                  "rounded p-1 shrink-0",
                  texts.length <= 1
                    ? "text-muted-foreground cursor-not-allowed"
                    : "hover:bg-destructive/10 text-destructive",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addText}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Texto
          </Button>
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Estilo do Texto
        </Label>

        <div className="space-y-2">
          <Label className="text-xs">Tamanho</Label>
          <div className="grid grid-cols-5 gap-1">
            {FONT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange({
                    ...props,
                    fontSize: opt.value,
                    bigText: opt.value === "2xl",
                  })
                }
                className={cn(
                  "rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                  fontSize === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Cor do Texto Estático</Label>
          <p className="text-[10px] text-muted-foreground">
            Cor do texto fixo (antes e depois)
          </p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={staticTextColor}
              onChange={(e) =>
                onChange({ ...props, staticTextColor: e.target.value })
              }
              className="h-9 w-12 rounded-lg cursor-pointer border border-border/50"
            />
            <Input
              value={staticTextColor}
              onChange={(e) =>
                onChange({ ...props, staticTextColor: e.target.value })
              }
              className="flex-1 font-mono text-xs"
              placeholder="#1A1A1A"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Cor do Texto Animado</Label>
          <p className="text-[10px] text-muted-foreground">
            Cor do texto que é digitado
          </p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={typewriterColor}
              onChange={(e) =>
                onChange({ ...props, typewriterColor: e.target.value })
              }
              className="h-9 w-12 rounded-lg cursor-pointer border border-border/50"
            />
            <Input
              value={typewriterColor}
              onChange={(e) =>
                onChange({ ...props, typewriterColor: e.target.value })
              }
              className="flex-1 font-mono text-xs"
              placeholder="#C9A84C"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Velocidade</Label>
          <Input
            type="number"
            value={speed}
            onChange={(e) =>
              onChange({ ...props, speed: parseInt(e.target.value) || 70 })
            }
            min={10}
            max={200}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Atraso Inicial</Label>
          <Input
            type="number"
            value={initialDelay}
            onChange={(e) =>
              onChange({
                ...props,
                initialDelay: parseInt(e.target.value) || 0,
              })
            }
            min={0}
            max={5000}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Tempo Pausa</Label>
          <Input
            type="number"
            value={waitTime}
            onChange={(e) =>
              onChange({ ...props, waitTime: parseInt(e.target.value) || 2000 })
            }
            min={500}
            max={10000}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Velocidade Apagar</Label>
          <Input
            type="number"
            value={deleteSpeed}
            onChange={(e) =>
              onChange({
                ...props,
                deleteSpeed: parseInt(e.target.value) || 40,
              })
            }
            min={10}
            max={100}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Caractere Cursor</Label>
          <Input
            value={cursorChar}
            onChange={(e) =>
              onChange({ ...props, cursorChar: e.target.value || "_" })
            }
            maxLength={3}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showCursor"
          checked={showCursor}
          onChange={(e) => onChange({ ...props, showCursor: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="showCursor" className="cursor-pointer">
          Mostrar cursor
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="loop"
          checked={loop}
          onChange={(e) => onChange({ ...props, loop: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="loop" className="cursor-pointer">
          Repetir infinitamente
        </Label>
      </div>

      <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
        <Label className="text-xs font-semibold">Texto Fixo</Label>
        <div className="space-y-2">
          <Input
            value={preText}
            onChange={(e) => onChange({ ...props, preText: e.target.value })}
            placeholder="Texto antes (opcional)"
            className="h-8 text-xs"
          />
          <Input
            value={postText}
            onChange={(e) => onChange({ ...props, postText: e.target.value })}
            placeholder="Texto depois (opcional)"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Posição do Texto</Label>
        <div className="flex gap-1">
          {[
            { value: "left", label: "← Esquerda" },
            { value: "center", label: "↔ Centro" },
            { value: "right", label: "Direita →" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...props, textPosition: opt.value })}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                textPosition === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
