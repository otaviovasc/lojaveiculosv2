import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { WebsiteBuilderImageUrlField } from "./WebsiteBuilderImageFields";
import { StorefrontImagePicker } from "./StorefrontImagePicker";
import type {
  WebsiteBuilderConfig,
  WebsiteBuilderTestimonial,
} from "./WebsiteBuilderTypes";

type UpdateConfig = <K extends keyof WebsiteBuilderConfig>(
  key: K,
  value: WebsiteBuilderConfig[K],
) => void;

export function WebsiteBuilderAboutPanel({
  config,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  updateConfig: UpdateConfig;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Conteudo
        </h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aboutTitle">Titulo da Secao</Label>
            <Input
              className="h-10"
              id="aboutTitle"
              onChange={(event) =>
                updateConfig("aboutTitle", event.target.value)
              }
              placeholder="Ex: Sobre Nos"
              value={config.aboutTitle ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aboutText">Texto Sobre Voce</Label>
            <Textarea
              className="min-h-[120px] resize-y"
              id="aboutText"
              maxLength={3000}
              onChange={(event) =>
                updateConfig("aboutText", event.target.value)
              }
              rows={5}
              value={config.aboutText ?? ""}
            />
            <span className="text-xs text-muted-foreground">
              Max. 3000 caracteres
            </span>
          </div>
        </div>
      </div>
      <WebsiteBuilderImageUrlField
        imageClassName="h-32 w-full rounded-xl"
        label="Imagem da Secao"
        onChange={(value) => updateConfig("aboutImageUrl", value)}
        value={config.aboutImageUrl ?? ""}
      />
    </div>
  );
}

export function WebsiteBuilderContactPanel({
  config,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  updateConfig: UpdateConfig;
}) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Informacoes de contato exibidas no site.
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
          <Input
            className="h-10"
            id="whatsapp"
            onChange={(event) =>
              updateConfig("socialLinks", {
                ...config.socialLinks,
                whatsapp: event.target.value,
              })
            }
            placeholder="5511999999999"
            value={config.socialLinks.whatsapp ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            className="h-10"
            id="instagram"
            onChange={(event) =>
              updateConfig("socialLinks", {
                ...config.socialLinks,
                instagram: event.target.value,
              })
            }
            placeholder="https://instagram.com/seuperfil"
            value={config.socialLinks.instagram ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email de contato</Label>
          <Input
            className="h-10"
            id="email"
            onChange={(event) =>
              updateConfig("contact", {
                ...config.contact,
                email: event.target.value,
              })
            }
            placeholder="contato@exemplo.com"
            value={config.contact.email ?? ""}
          />
        </div>
      </div>
    </div>
  );
}

export function WebsiteBuilderTestimonialsPanel({
  config,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  updateConfig: UpdateConfig;
}) {
  const testimonials = config.testimonials ?? [];
  const updateTestimonial = (
    id: string,
    patch: Partial<WebsiteBuilderTestimonial>,
  ) => {
    updateConfig(
      "testimonials",
      testimonials.map((testimonial) =>
        testimonial.id === id ? { ...testimonial, ...patch } : testimonial,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Depoimentos
      </h4>
      {testimonials.length ? (
        <div className="space-y-3">
          {testimonials.map((testimonial, index) => (
            <div
              className="space-y-3 rounded-xl border border-border bg-card p-3"
              key={testimonial.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Depoimento {index + 1}
                </span>
                <button
                  aria-label="Remover depoimento"
                  className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                  onClick={() =>
                    updateConfig(
                      "testimonials",
                      testimonials.filter((item) => item.id !== testimonial.id),
                    )
                  }
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  onChange={(event) =>
                    updateTestimonial(testimonial.id, {
                      name: event.target.value,
                    })
                  }
                  value={testimonial.name}
                />
              </div>
              <StorefrontImagePicker
                imageClassName="size-20 rounded-full"
                label="Imagem do cliente"
                onChange={(value) =>
                  updateTestimonial(testimonial.id, { imageSrc: value })
                }
                value={testimonial.imageSrc ?? ""}
              />
              <div className="space-y-2">
                <Label>Descricao</Label>
                <Input
                  onChange={(event) =>
                    updateTestimonial(testimonial.id, {
                      role: event.target.value,
                    })
                  }
                  value={testimonial.role}
                />
              </div>
              <div className="space-y-2">
                <Label>Texto</Label>
                <Textarea
                  onChange={(event) =>
                    updateTestimonial(testimonial.id, {
                      quote: event.target.value,
                    })
                  }
                  rows={3}
                  value={testimonial.quote}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhum depoimento cadastrado.
        </div>
      )}
      <Button
        onClick={() =>
          updateConfig("testimonials", [...testimonials, createTestimonial()])
        }
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Adicionar depoimento
      </Button>
    </div>
  );
}

function createTestimonial(): WebsiteBuilderTestimonial {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `testimonial_${Date.now()}`;
  return {
    id,
    imageSrc: null,
    name: "Cliente",
    quote: "Atendimento transparente e entrega muito bem acompanhada.",
    role: "Comprador",
  };
}
