import { Check } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  websiteBuilderTemplateBranding,
  websiteBuilderTemplateIds,
  websiteBuilderTemplateInfo,
} from "./WebsiteBuilderModel";
import { WebsiteBuilderImageUrlField } from "./WebsiteBuilderImageFields";
import { WebsiteBuilderHeroMediaSettings } from "./WebsiteBuilderHeroMediaSettings";
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
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border/50 hover:border-line-strong",
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
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
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
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
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
          Informações
        </h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="corretorName">Nome / Título da Marca</Label>
            <Input
              className="h-10"
              id="corretorName"
              onChange={(event) =>
                updateConfig("corretorName", event.target.value)
              }
              placeholder="Ex: Loja Veículos Premium"
              value={config.corretorName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="corretorCreci">Registro / Identificação</Label>
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <WebsiteBuilderImageUrlField
          imageClassName="h-24 w-24 rounded-full"
          label="Sua Foto"
          onChange={(value) => updateConfig("corretorPhotoUrl", value)}
          value={config.corretorPhotoUrl ?? ""}
        />
        <WebsiteBuilderImageUrlField
          imageClassName="h-16 min-w-[120px] max-w-[140px] rounded-xl bg-card p-2"
          label="Sua Logo"
          onChange={(value) => updateConfig("logoUrl", value)}
          value={config.logoUrl ?? ""}
        />
        <WebsiteBuilderImageUrlField
          imageClassName="h-16 w-16 rounded-xl bg-card p-2"
          label="Favicon"
          onChange={(value) => updateConfig("faviconUrl", value)}
          value={config.faviconUrl ?? ""}
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
        <Label>Fonte dos títulos</Label>
        <FeatureSelect
          className="h-10 border-input bg-background text-foreground"
          onChange={(heading) =>
            updateConfig("fonts", {
              ...config.fonts,
              heading,
            })
          }
          options={storefrontFontOptions}
          radius="md"
          value={config.fonts.heading ?? storefrontFontOptions[0]?.value ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label>Fonte dos textos</Label>
        <FeatureSelect
          className="h-10 border-input bg-background text-foreground"
          onChange={(body) =>
            updateConfig("fonts", {
              ...config.fonts,
              body,
            })
          }
          options={storefrontFontOptions}
          radius="md"
          value={config.fonts.body ?? storefrontFontOptions[0]?.value ?? ""}
        />
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
            <Label htmlFor="heroTitle">Título de Impacto</Label>
            <Input
              className="h-10"
              id="heroTitle"
              maxLength={80}
              onChange={(event) =>
                updateConfig("heroTitle", event.target.value)
              }
              placeholder="Ex: O veículo dos seus sonhos está aqui"
              value={config.heroTitle}
            />
            <span className="text-xs text-muted-foreground">
              Max. 80 caracteres
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Subtítulo ou Chamada</Label>
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
            <span className="text-xs text-muted-foreground">
              Max. 160 caracteres
            </span>
          </div>
        </div>
      </div>
      <WebsiteBuilderHeroMediaSettings
        config={config}
        updateConfig={updateConfig}
      />
    </div>
  );
}
