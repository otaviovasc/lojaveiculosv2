"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import type { PropsEditorProps } from "./types";

interface FooterLink {
  title: string;
  href: string;
  icon?: string;
}

interface FooterColumn {
  label: string;
  links: FooterLink[];
}

type FooterEditorProps = PropsEditorProps;

export function FooterEditor({ props, onChange }: FooterEditorProps) {
  const columns: FooterColumn[] = (props.columns as FooterColumn[]) || [];
  const logoText = (props.logoText as string) || "";
  const copyrightText = (props.copyrightText as string) || "";
  const showSocial = (props.showSocial as boolean) ?? true;
  const socialLinks = (props.socialLinks as Record<string, string>) || {};

  const updateColumns = (newColumns: FooterColumn[]) => {
    onChange({ ...props, columns: newColumns });
  };

  const addColumn = () => {
    const newColumn: FooterColumn = {
      label: "Nova Coluna",
      links: [{ title: "Link", href: "#" }],
    };
    updateColumns([...columns, newColumn]);
  };

  const removeColumn = (index: number) => {
    updateColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumnLabel = (index: number, label: string) => {
    const newColumns = [...columns];
    const existing = newColumns[index];
    if (existing) {
      newColumns[index] = { ...existing, label };
      updateColumns(newColumns);
    }
  };

  const addLink = (columnIndex: number) => {
    const newColumns = [...columns];
    const column = newColumns[columnIndex];
    if (column) {
      newColumns[columnIndex] = {
        ...column,
        links: [...column.links, { title: "Novo Link", href: "#" }],
      };
      updateColumns(newColumns);
    }
  };

  const removeLink = (columnIndex: number, linkIndex: number) => {
    const newColumns = [...columns];
    const column = newColumns[columnIndex];
    if (column) {
      newColumns[columnIndex] = {
        ...column,
        links: column.links.filter((_, i) => i !== linkIndex),
      };
      updateColumns(newColumns);
    }
  };

  const updateLink = (
    columnIndex: number,
    linkIndex: number,
    updates: Partial<FooterLink>,
  ) => {
    const newColumns = [...columns];
    const column = newColumns[columnIndex];
    if (column) {
      const link = column.links[linkIndex];
      if (link) {
        newColumns[columnIndex] = {
          ...column,
          links: column.links.map((l, i) =>
            i === linkIndex ? { ...l, ...updates } : l,
          ),
        };
        updateColumns(newColumns);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Logo / Nome</Label>
        <Input
          value={logoText}
          onChange={(e) => onChange({ ...props, logoText: e.target.value })}
          placeholder="Nome da vitrine (deixe vazio para usar o workspace)"
        />
        <p className="text-[10px] text-muted-foreground">
          Se vazio, usamos o nome do workspace e, em seguida, o nome do corretor
          na configuração da vitrine.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Texto de Copyright (opcional)</Label>
        <Input
          value={copyrightText}
          onChange={(e) =>
            onChange({ ...props, copyrightText: e.target.value })
          }
          placeholder="© 2024 Empresa. Todos os direitos reservados."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showSocial"
          checked={showSocial}
          onChange={(e) => onChange({ ...props, showSocial: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="showSocial" className="cursor-pointer">
          Mostrar redes sociais
        </Label>
      </div>

      {showSocial && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
          <Label className="text-xs font-semibold">Redes Sociais</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "facebook", label: "Facebook" },
              { key: "instagram", label: "Instagram" },
              { key: "youtube", label: "YouTube" },
              { key: "linkedin", label: "LinkedIn" },
              { key: "whatsapp", label: "WhatsApp" },
            ].map(({ key }) => (
              <div key={key} className="flex items-center gap-2">
                <Input
                  value={socialLinks[key] || ""}
                  onChange={(e) =>
                    onChange({
                      ...props,
                      socialLinks: { ...socialLinks, [key]: e.target.value },
                    })
                  }
                  placeholder={`https://${key}.com/...`}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Colunas de Links</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addColumn}
            className="gap-1 h-7"
          >
            <Plus className="h-3 w-3" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={column.label}
                  onChange={(e) =>
                    updateColumnLabel(columnIndex, e.target.value)
                  }
                  placeholder="Título da coluna"
                  className="flex-1 h-8 text-xs"
                />
                <button
                  type="button"
                  onClick={() => removeColumn(columnIndex)}
                  className="rounded p-1 hover:bg-destructive/10 text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 pl-6">
                {column.links.map((link, linkIndex) => (
                  <div key={linkIndex} className="flex items-center gap-2">
                    <Input
                      value={link.title}
                      onChange={(e) =>
                        updateLink(columnIndex, linkIndex, {
                          title: e.target.value,
                        })
                      }
                      placeholder="Texto do link"
                      className="flex-1 h-7 text-xs"
                    />
                    <Input
                      value={link.href}
                      onChange={(e) =>
                        updateLink(columnIndex, linkIndex, {
                          href: e.target.value,
                        })
                      }
                      placeholder="/pagina"
                      className="flex-1 h-7 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(columnIndex, linkIndex)}
                      className="rounded p-1 hover:bg-destructive/10 text-destructive shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addLink(columnIndex)}
                  className="w-full h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar Link
                </Button>
              </div>
            </div>
          ))}

          {columns.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              Nenhuma coluna. Clique em &quot;Adicionar&quot; acima.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
