import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { WebsiteBuilderImageUrlField } from "./WebsiteBuilderImageFields";
import type {
  WebsiteBuilderAboutFeature,
  WebsiteBuilderConfig,
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
  const updateFeature = (
    index: number,
    patch: Partial<WebsiteBuilderAboutFeature>,
  ) => {
    updateConfig(
      "aboutFeatures",
      config.aboutFeatures.map((feature, featureIndex) =>
        featureIndex === index ? { ...feature, ...patch } : feature,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          História da loja
        </h4>
        <TextField
          id="aboutTitle"
          label="Título da seção"
          onChange={(value) => updateConfig("aboutTitle", value)}
          value={config.aboutTitle ?? ""}
        />
        <TextAreaField
          id="aboutText"
          label="Apresentação"
          onChange={(value) => updateConfig("aboutText", value)}
          value={config.aboutText ?? ""}
        />
        <TextAreaField
          id="aboutCuradoriaText"
          label="Texto sobre a curadoria"
          onChange={(value) => updateConfig("aboutCuradoriaText", value)}
          value={config.aboutCuradoriaText ?? ""}
        />
        <TextField
          id="aboutButtonText"
          label="Texto do botão"
          onChange={(value) => updateConfig("aboutButtonText", value)}
          value={config.aboutButtonText ?? ""}
        />
      </div>

      <div className="space-y-4">
        <WebsiteBuilderImageUrlField
          imageClassName="h-32 w-full rounded-lg"
          label="Imagem principal"
          onChange={(value) => updateConfig("aboutImageUrl", value)}
          value={config.aboutImageUrl ?? ""}
        />
        <WebsiteBuilderImageUrlField
          imageClassName="h-32 w-full rounded-lg"
          label="Imagem do showroom"
          onChange={(value) => updateConfig("aboutImage2Url", value)}
          value={config.aboutImage2Url ?? ""}
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Diferenciais
        </h4>
        <TextField
          id="aboutWhyTitle"
          label="Título dos diferenciais"
          onChange={(value) => updateConfig("aboutWhyTitle", value)}
          value={config.aboutWhyTitle ?? ""}
        />
        <TextAreaField
          id="aboutWhyText"
          label="Descrição dos diferenciais"
          onChange={(value) => updateConfig("aboutWhyText", value)}
          value={config.aboutWhyText ?? ""}
        />
        <div className="space-y-3">
          {config.aboutFeatures.map((feature, index) => (
            <div
              className="space-y-2.5 rounded-lg border border-border/40 bg-muted/20 p-2.5"
              key={`${feature.title}-${index}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Diferencial {index + 1}
                </span>
                <button
                  aria-label={`Remover diferencial ${index + 1}`}
                  className="rounded-lg p-1.5 text-danger-soft-foreground transition-colors hover:bg-destructive/10"
                  onClick={() =>
                    updateConfig(
                      "aboutFeatures",
                      config.aboutFeatures.filter(
                        (_, featureIndex) => featureIndex !== index,
                      ),
                    )
                  }
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <TextField
                id={`aboutFeatureTitle${index}`}
                label="Título"
                onChange={(value) => updateFeature(index, { title: value })}
                value={feature.title}
              />
              <TextField
                id={`aboutFeatureDescription${index}`}
                label="Descrição"
                onChange={(value) =>
                  updateFeature(index, { description: value })
                }
                value={feature.description}
              />
            </div>
          ))}
        </div>
        <Button
          disabled={config.aboutFeatures.length >= 6}
          onClick={() =>
            updateConfig("aboutFeatures", [
              ...config.aboutFeatures,
              {
                description: "Descreva este diferencial",
                title: "Diferencial",
              },
            ])
          }
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar diferencial
        </Button>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        className="h-10"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        className="min-h-24 resize-y"
        id={id}
        maxLength={3000}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        value={value}
      />
    </div>
  );
}
