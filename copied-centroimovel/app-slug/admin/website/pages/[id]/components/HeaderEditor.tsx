"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { PropsEditorProps } from "./types";

interface HeaderLink {
  title: string;
  href: string;
}

type HeaderEditorProps = PropsEditorProps;

export function HeaderEditor({ props, onChange }: HeaderEditorProps) {
  const links: HeaderLink[] = (props.links as HeaderLink[]) || [];
  const logoText = (props.logoText as string) || "";
  const sticky = (props.sticky as boolean) ?? true;
  const showContactButton = (props.showContactButton as boolean) ?? true;
  const contactButtonText =
    (props.contactButtonText as string) || "Fale Conosco";
  const contactButtonLink = (props.contactButtonLink as string) || "#contato";
  const showSocial = (props.showSocial as boolean) ?? true;

  const updateLinks = (newLinks: HeaderLink[]) => {
    onChange({ ...props, links: newLinks });
  };

  const addLink = () => {
    const newLink: HeaderLink = {
      title: "Novo Link",
      href: "#",
    };
    updateLinks([...links, newLink]);
  };

  const removeLink = (index: number) => {
    updateLinks(links.filter((_, i) => i !== index));
  };

  const updateLinkItem = (index: number, updates: Partial<HeaderLink>) => {
    const newLinks = links.map((l, i) =>
      i === index ? { ...l, ...updates } : l,
    );
    updateLinks(newLinks);
  };

  return (
    <div className="space-y-6">
      {/* Logo Text */}
      <div className="space-y-2">
        <Label>Texto do Logo</Label>
        <Input
          value={logoText}
          onChange={(e) => onChange({ ...props, logoText: e.target.value })}
          placeholder="Ex: Minha Imobiliária"
        />
      </div>

      {/* Sticky Header */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="sticky"
          checked={sticky}
          onChange={(e) => onChange({ ...props, sticky: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor="sticky">Fixar no topo (Sticky)</Label>
      </div>

      {/* Navigation Links */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Links de Navegação</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={addLink}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>

        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center border border-dashed border-border/50 rounded-lg">
            Nenhum link configurado.
          </p>
        ) : (
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {links.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-muted/20"
              >
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={link.title}
                    onChange={(e) =>
                      updateLinkItem(index, { title: e.target.value })
                    }
                    placeholder="Título (ex: Sobre)"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={link.href}
                    onChange={(e) =>
                      updateLinkItem(index, { href: e.target.value })
                    }
                    placeholder="URL (ex: #about)"
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => removeLink(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Button */}
      <div className="space-y-4 rounded-lg border border-border/40 p-3 bg-muted/10">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showContactButton"
            checked={showContactButton}
            onChange={(e) =>
              onChange({ ...props, showContactButton: e.target.checked })
            }
            className="h-4 w-4 rounded border-border"
          />
          <Label
            htmlFor="showContactButton"
            className="font-semibold text-xs uppercase text-muted-foreground"
          >
            Botão de Ação (CTA)
          </Label>
        </div>

        {showContactButton && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Texto do Botão</Label>
              <Input
                value={contactButtonText}
                onChange={(e) =>
                  onChange({ ...props, contactButtonText: e.target.value })
                }
                placeholder="Ex: Fale Conosco"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link/URL do Botão</Label>
              <Input
                value={contactButtonLink}
                onChange={(e) =>
                  onChange({ ...props, contactButtonLink: e.target.value })
                }
                placeholder="Ex: https://wa.me/... ou #contato"
                className="h-9 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Social Icons Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showSocial"
          checked={showSocial}
          onChange={(e) => onChange({ ...props, showSocial: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor="showSocial">Mostrar Ícones de Redes Sociais</Label>
      </div>
    </div>
  );
}
