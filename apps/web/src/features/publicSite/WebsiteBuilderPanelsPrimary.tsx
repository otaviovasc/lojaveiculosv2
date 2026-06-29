import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  websiteBuilderTemplateBranding,
  websiteBuilderTemplateIds,
  websiteBuilderTemplateInfo,
} from "./WebsiteBuilderModel";
import {
  WebsiteBuilderHeroImageField,
  WebsiteBuilderImageUrlField,
} from "./WebsiteBuilderImageFields";
import { storefrontFontOptions } from "./storefrontFonts";
import type {
  WebsiteBuilderConfig,
  WebsiteBuilderTemplateId,
} from "./WebsiteBuilderTypes";

type UpdateConfig = <K extends keyof WebsiteBuilderConfig>(
  key: K,
  value: WebsiteBuilderConfig[K],
) => void;

export function WebsiteBuilderTemplatePanel({
  onChange,
  templateId,
}: {
  onChange: (templateId: WebsiteBuilderTemplateId) => void;
  templateId: WebsiteBuilderTemplateId;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Escolha o modelo visual do seu site.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {websiteBuilderTemplateIds.map((id) => {
          const selected = templateId === id;
          const branding = websiteBuilderTemplateBranding[id];
          return (
            <button
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300",
                selected
                  ? "border-primary shadow-lg ring-2 ring-primary/20"
                  : "border-border/50 hover:border-muted-foreground/30 hover:shadow-md",
              )}
              key={id}
              onClick={() => onChange(id)}
              type="button"
            >
              <div
                className={cn(
                  "absolute inset-0 bg-linear-to-br transition-opacity duration-300",
                  branding.gradient,
                  selected ? "opacity-100" : "opacity-0 group-hover:opacity-60",
                )}
              />
              <div className="relative z-10">
                <div className="mb-2 flex items-center justify-between">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                      selected
                        ? "bg-primary/15 text-primary"
                        : "bg-muted/60 text-muted-foreground",
                    )}
                  >
                    <span className="text-xs">{branding.icon}</span>
                    {branding.tagline}
                  </div>
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60",
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3 w-3 transition-opacity",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>
                </div>
                <p className="text-sm font-bold">
                  {websiteBuilderTemplateInfo[id].name}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {websiteBuilderTemplateInfo[id].description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WebsiteBuilderBrandPanel({
  config,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  updateConfig: UpdateConfig;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Informacoes
        </h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="corretorName">Nome / Titulo da Marca</Label>
            <Input
              className="h-10"
              id="corretorName"
              onChange={(event) =>
                updateConfig("corretorName", event.target.value)
              }
              placeholder="Ex: Loja Veiculos Premium"
              value={config.corretorName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="corretorCreci">Registro / Identificacao</Label>
            <Input
              className="h-10"
              id="corretorCreci"
              onChange={(event) =>
                updateConfig("corretorCreci", event.target.value)
              }
              placeholder="Ex: Desde 2015"
              value={config.corretorCreci ?? ""}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <WebsiteBuilderImageUrlField
          imageClassName="h-24 w-24 rounded-full"
          label="Sua Foto"
          onChange={(value) => updateConfig("corretorPhotoUrl", value)}
          placeholder="https://..."
          value={config.corretorPhotoUrl ?? ""}
        />
        <WebsiteBuilderImageUrlField
          imageClassName="h-16 min-w-[120px] max-w-[140px] rounded-xl bg-card p-2"
          label="Sua Logo"
          onChange={(value) => updateConfig("logoUrl", value)}
          placeholder="https://..."
          value={config.logoUrl ?? ""}
        />
      </div>
    </div>
  );
}

export function WebsiteBuilderTypographyPanel({
  config,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  updateConfig: UpdateConfig;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="headingFont">Fonte dos titulos</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          id="headingFont"
          onChange={(event) =>
            updateConfig("fonts", {
              ...config.fonts,
              heading: event.target.value,
            })
          }
          value={config.fonts.heading}
        >
          {storefrontFontOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bodyFont">Fonte dos textos</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          id="bodyFont"
          onChange={(event) =>
            updateConfig("fonts", {
              ...config.fonts,
              body: event.target.value,
            })
          }
          value={config.fonts.body}
        >
          {storefrontFontOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function WebsiteBuilderHeroPanel({
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
          Textos
        </h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">Titulo de Impacto</Label>
            <Input
              className="h-10"
              id="heroTitle"
              maxLength={80}
              onChange={(event) =>
                updateConfig("heroTitle", event.target.value)
              }
              placeholder="Ex: O veiculo dos seus sonhos esta aqui"
              value={config.heroTitle}
            />
            <span className="text-[11px] text-muted-foreground">
              Max. 80 caracteres
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Subtitulo ou Chamada</Label>
            <Input
              className="h-10"
              id="heroSubtitle"
              maxLength={160}
              onChange={(event) =>
                updateConfig("heroSubtitle", event.target.value)
              }
              placeholder="Ex: Atendimento exclusivo e personalizado"
              value={config.heroSubtitle ?? ""}
            />
            <span className="text-[11px] text-muted-foreground">
              Max. 160 caracteres
            </span>
          </div>
        </div>
      </div>
      <WebsiteBuilderHeroImageField
        onChange={(value) => updateConfig("heroImageUrl", value)}
        value={config.heroImageUrl ?? ""}
      />
    </div>
  );
}
