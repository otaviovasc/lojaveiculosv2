import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteBuilderImageUrlField } from "./WebsiteBuilderImageFields";
import type { WebsiteBuilderConfig } from "./WebsiteBuilderTypes";

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
            <span className="text-[11px] text-muted-foreground">
              Max. 3000 caracteres
            </span>
          </div>
        </div>
      </div>
      <WebsiteBuilderImageUrlField
        imageClassName="h-32 w-full rounded-xl"
        label="Imagem da Secao"
        onChange={(value) => updateConfig("aboutImageUrl", value)}
        placeholder="https://..."
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

export function WebsiteBuilderTestimonialsPanel() {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Depoimentos
      </h4>
      <p className="text-xs text-muted-foreground">
        Os depoimentos seguem salvos no tema do site e aparecem nas secoes
        publicadas.
      </p>
    </div>
  );
}
