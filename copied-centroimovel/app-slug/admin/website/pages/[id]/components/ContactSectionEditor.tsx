"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PropsEditorProps } from "./types";

const BUTTON_STYLE_OPTIONS = [
  { value: "primary", label: "Primária" },
  { value: "secondary", label: "Secundária" },
  { value: "outline", label: "Outline" },
];

export function ContactSectionEditor({ props, onChange }: PropsEditorProps) {
  const style = (props.style as Record<string, unknown>) || {};

  const updateStyle = (key: string, value: unknown) => {
    onChange({ ...props, style: { ...style, [key]: value } });
  };

  const fields = (props.fields as Record<string, boolean>) || {
    name: true,
    phone: true,
    email: true,
    message: true,
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Conteúdo
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs">Título</Label>
          <Input
            value={(props.title as string) || ""}
            onChange={(e) => onChange({ ...props, title: e.target.value })}
            placeholder="Fale Conosco"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Subtítulo</Label>
          <Input
            value={(props.subtitle as string) || ""}
            onChange={(e) => onChange({ ...props, subtitle: e.target.value })}
            placeholder="Estamos à disposição para ajudar"
          />
        </div>

        <div className="space-y-2 rounded-lg border border-border/50 bg-muted/15 p-3">
          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
            Cores do título (seção)
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Telefone, e-mail e endereço seguem a cor do texto em Estilo do
            componente (Tipografia).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={(props.titleColor as string) || "#1c1917"}
                  onChange={(e) =>
                    onChange({ ...props, titleColor: e.target.value })
                  }
                  className="h-8 w-8 cursor-pointer rounded border border-border/50"
                />
                <Input
                  value={(props.titleColor as string) || ""}
                  onChange={(e) =>
                    onChange({ ...props, titleColor: e.target.value })
                  }
                  className="h-8 font-mono text-xs"
                  placeholder="#1c1917"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subtítulo</Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={(props.subtitleColor as string) || "#57534e"}
                  onChange={(e) =>
                    onChange({ ...props, subtitleColor: e.target.value })
                  }
                  className="h-8 w-8 cursor-pointer rounded border border-border/50"
                />
                <Input
                  value={(props.subtitleColor as string) || ""}
                  onChange={(e) =>
                    onChange({ ...props, subtitleColor: e.target.value })
                  }
                  className="h-8 font-mono text-xs"
                  placeholder="#57534e"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Texto do Botão</Label>
          <Input
            value={(props.submitButtonText as string) || "Enviar Mensagem"}
            onChange={(e) =>
              onChange({ ...props, submitButtonText: e.target.value })
            }
            placeholder="Enviar Mensagem"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Mensagem de Sucesso</Label>
          <Input
            value={
              (props.successMessage as string) ||
              "Mensagem enviada com sucesso!"
            }
            onChange={(e) =>
              onChange({ ...props, successMessage: e.target.value })
            }
            placeholder="Mensagem enviada com sucesso!"
          />
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Campos do Formulário
        </Label>

        <div className="space-y-2 rounded-lg border border-border/50 p-3">
          {["name", "phone", "email", "message"].map((field) => (
            <label
              key={field}
              className="flex cursor-pointer items-center gap-2"
            >
              <input
                type="checkbox"
                checked={fields[field] ?? true}
                onChange={(e) =>
                  onChange({
                    ...props,
                    fields: { ...fields, [field]: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded"
              />
              <span className="text-sm capitalize">
                {field === "name" && "Nome"}
                {field === "phone" && "WhatsApp"}
                {field === "email" && "Email"}
                {field === "message" && "Mensagem"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Estilo do Botão
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs">Estilo</Label>
          <div className="flex gap-1">
            {BUTTON_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...props, buttonStyle: opt.value })}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-medium transition-colors",
                  (props.buttonStyle as string) === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Cor do Botão</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={(props.buttonColor as string) || "#C9A84C"}
                onChange={(e) =>
                  onChange({ ...props, buttonColor: e.target.value })
                }
                className="h-8 w-8 cursor-pointer rounded border border-border/50"
              />
              <Input
                value={(props.buttonColor as string) || ""}
                onChange={(e) =>
                  onChange({ ...props, buttonColor: e.target.value })
                }
                className="h-8 font-mono text-xs"
                placeholder="#C9A84C"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cor do Texto</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={(props.buttonTextColor as string) || "#FFFFFF"}
                onChange={(e) =>
                  onChange({ ...props, buttonTextColor: e.target.value })
                }
                className="h-8 w-8 cursor-pointer rounded border border-border/50"
              />
              <Input
                value={(props.buttonTextColor as string) || ""}
                onChange={(e) =>
                  onChange({ ...props, buttonTextColor: e.target.value })
                }
                className="h-8 font-mono text-xs"
                placeholder="#FFFFFF"
              />
            </div>
          </div>
        </div>
        {(props.buttonStyle as string) === "outline" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Cor da Borda</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={(props.buttonBorderColor as string) || "#FFFFFF"}
                onChange={(e) =>
                  onChange({ ...props, buttonBorderColor: e.target.value })
                }
                className="h-8 w-8 cursor-pointer rounded border border-border/50"
              />
              <Input
                value={(props.buttonBorderColor as string) || ""}
                onChange={(e) =>
                  onChange({ ...props, buttonBorderColor: e.target.value })
                }
                className="h-8 font-mono text-xs"
                placeholder="#FFFFFF"
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Cartão do formulário
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs">Cor do Formulário</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={
                (props.formBackgroundColor as string) ||
                (style.formBackgroundColor as string) ||
                "#FFFFFF"
              }
              onChange={(e) => {
                const v = e.target.value;
                const nextStyle = { ...style };
                delete nextStyle.formBackgroundColor;
                onChange({
                  ...props,
                  formBackgroundColor: v,
                  style: nextStyle,
                });
              }}
              className="h-9 w-12 rounded-lg cursor-pointer border border-border/50"
            />
            <Input
              value={
                (props.formBackgroundColor as string) ||
                (style.formBackgroundColor as string) ||
                ""
              }
              onChange={(e) => {
                const v = e.target.value;
                const nextStyle = { ...style };
                delete nextStyle.formBackgroundColor;
                onChange({
                  ...props,
                  formBackgroundColor: v,
                  style: nextStyle,
                });
              }}
              className="flex-1 font-mono text-xs"
              placeholder="#FFFFFF"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cor do Texto do Formulário</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={
                (props.formTextColor as string) ||
                (style.formTextColor as string) ||
                "#1A1A1A"
              }
              onChange={(e) => {
                const v = e.target.value;
                const nextStyle = { ...style };
                delete nextStyle.formTextColor;
                onChange({
                  ...props,
                  formTextColor: v,
                  style: nextStyle,
                });
              }}
              className="h-9 w-12 rounded-lg cursor-pointer border border-border/50"
            />
            <Input
              value={
                (props.formTextColor as string) ||
                (style.formTextColor as string) ||
                ""
              }
              onChange={(e) => {
                const v = e.target.value;
                const nextStyle = { ...style };
                delete nextStyle.formTextColor;
                onChange({
                  ...props,
                  formTextColor: v,
                  style: nextStyle,
                });
              }}
              className="flex-1 font-mono text-xs"
              placeholder="#1A1A1A"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
