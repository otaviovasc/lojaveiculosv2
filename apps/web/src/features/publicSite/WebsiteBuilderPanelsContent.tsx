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

export { WebsiteBuilderAboutPanel } from "./WebsiteBuilderAboutPanel";
export { WebsiteBuilderContactPanel } from "./WebsiteBuilderContactPanel";

export function WebsiteBuilderSeoPanel({
  config,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  updateConfig: UpdateConfig;
}) {
  const displayTitle =
    config.seo.metaTitle ||
    config.corretorName ||
    "Sua Loja de Veículos - Seminovos e Usados";
  const displayDescription =
    config.seo.metaDescription ||
    "Confira nosso estoque de veículos seminovos com garantia, procedência e as melhores condições de financiamento.";
  const displayImage =
    config.seo.ogImageUrl || config.heroImageUrl || config.logoUrl;

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Como o site aparece nos buscadores e ao ser compartilhado.
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="seoMetaTitle">Título para buscadores</Label>
          <Input
            className="h-10"
            id="seoMetaTitle"
            maxLength={120}
            onChange={(event) =>
              updateConfig("seo", {
                ...config.seo,
                metaTitle: event.target.value,
              })
            }
            placeholder="Ex: Loja Veículos Premium - Seminovos em São Paulo"
            value={config.seo.metaTitle ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seoMetaDescription">Descrição para buscadores</Label>
          <Textarea
            className="min-h-[90px] resize-y"
            id="seoMetaDescription"
            maxLength={300}
            onChange={(event) =>
              updateConfig("seo", {
                ...config.seo,
                metaDescription: event.target.value,
              })
            }
            rows={3}
            value={config.seo.metaDescription ?? ""}
          />
          <span className="text-xs text-muted-foreground">
            Max. 300 caracteres
          </span>
        </div>
      </div>
      <WebsiteBuilderImageUrlField
        imageClassName="h-32 w-full rounded-lg"
        label="Imagem de compartilhamento (OG Image)"
        onChange={(value) =>
          updateConfig("seo", { ...config.seo, ogImageUrl: value })
        }
        value={config.seo.ogImageUrl ?? ""}
      />

      <div className="space-y-4 border-t border-border/40 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pré-visualização de Compartilhamento
        </h4>

        {/* Google Search Result Preview */}
        <div className="space-y-1.5 rounded-lg border border-border/40 bg-card/60 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Google</span>
            <span>•</span>
            <span className="truncate">sualoja.com.br</span>
          </div>
          <p className="line-clamp-1 text-xs font-semibold text-primary hover:underline">
            {displayTitle}
          </p>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {displayDescription}
          </p>
        </div>

        {/* WhatsApp Share Card Preview */}
        <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Prévia no WhatsApp</span>
          </div>
          <div className="overflow-hidden rounded-md border border-border/50 bg-card">
            {displayImage ? (
              <img
                alt="Preview"
                className="h-28 w-full object-cover"
                src={displayImage}
              />
            ) : (
              <div className="flex h-20 w-full items-center justify-center bg-muted/40 text-xs text-muted-foreground">
                Sem imagem de destaque
              </div>
            )}
            <div className="p-2.5">
              <p className="line-clamp-1 text-xs font-bold text-foreground">
                {displayTitle}
              </p>
              <p className="line-clamp-2 mt-0.5 text-xs leading-tight text-muted-foreground">
                {displayDescription}
              </p>
              <span className="mt-1 block text-xs uppercase tracking-wider text-muted-foreground">
                sualoja.com.br
              </span>
            </div>
          </div>
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
              className="space-y-2.5 rounded-lg border border-border/40 bg-muted/20 p-2.5"
              key={testimonial.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Depoimento {index + 1}
                </span>
                <button
                  aria-label="Remover depoimento"
                  className="rounded-lg p-1.5 text-danger-soft-foreground transition-colors hover:bg-destructive/10"
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
                <Label>Descrição</Label>
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
