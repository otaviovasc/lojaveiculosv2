import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  applyInputMask,
  formatBrazilianDocument,
  formatBrazilianWhatsappPhone,
} from "../../lib/masks";
import type { WebsiteBuilderConfig } from "./WebsiteBuilderTypes";

type UpdateConfig = <K extends keyof WebsiteBuilderConfig>(
  key: K,
  value: WebsiteBuilderConfig[K],
) => void;

export function WebsiteBuilderContactPanel({
  config,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  updateConfig: UpdateConfig;
}) {
  const updateContact = (patch: Partial<WebsiteBuilderConfig["contact"]>) =>
    updateConfig("contact", { ...config.contact, ...patch });
  const updateFooter = (patch: Partial<WebsiteBuilderConfig["footer"]>) =>
    updateConfig("footer", { ...config.footer, ...patch });

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        A seção já vem preenchida. Substitua os dados de exemplo e publique
        quando estiver pronto.
      </p>

      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Texto da seção
        </h4>
        <TextField
          id="contactTitle"
          label="Título"
          onChange={(value) => updateContact({ title: value })}
          value={config.contact.title ?? ""}
        />
        <TextAreaField
          id="contactDescription1"
          label="Primeiro texto"
          onChange={(value) => updateContact({ description1: value })}
          value={config.contact.description1 ?? ""}
        />
        <TextAreaField
          id="contactDescription2"
          label="Segundo texto"
          onChange={(value) => updateContact({ description2: value })}
          value={config.contact.description2 ?? ""}
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Canais de atendimento
        </h4>
        <PhoneField
          id="whatsapp"
          label="WhatsApp (com DDD)"
          onChange={(value) =>
            updateConfig("socialLinks", {
              ...config.socialLinks,
              whatsapp: value,
            })
          }
          value={config.socialLinks.whatsapp ?? ""}
        />
        <TextField
          id="whatsappChannelLabel"
          label="Identificação do WhatsApp"
          onChange={(value) => updateContact({ phoneLabel: value })}
          value={config.contact.phoneLabel ?? ""}
        />
        <TextAreaField
          id="whatsappMessageTemplate"
          label="Mensagem padrão de atendimento (WhatsApp)"
          onChange={(value) =>
            updateConfig("contact", {
              ...config.contact,
              description1: value,
            })
          }
          placeholder="Ex: Olá! Vi o veículo no site e gostaria de agendar uma visita e simular um financiamento."
          value={config.contact.description1 ?? ""}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PhoneField
            id="phone2"
            label="Telefone adicional"
            onChange={(value) => updateContact({ phone2: value })}
            value={config.contact.phone2 ?? ""}
          />
          <TextField
            id="additionalChannelLabel"
            label="Identificação"
            onChange={(value) => updateContact({ phone2Label: value })}
            value={config.contact.phone2Label ?? ""}
          />
          <PhoneField
            id="phone3"
            label="Terceiro telefone"
            onChange={(value) => updateContact({ phone3: value })}
            value={config.contact.phone3 ?? ""}
          />
          <TextField
            id="thirdChannelLabel"
            label="Identificação"
            onChange={(value) => updateContact({ phone3Label: value })}
            value={config.contact.phone3Label ?? ""}
          />
        </div>
        <TextField
          id="instagram"
          label="Instagram"
          onChange={(value) =>
            updateConfig("socialLinks", {
              ...config.socialLinks,
              instagram: value,
            })
          }
          placeholder="https://instagram.com/seuperfil"
          value={config.socialLinks.instagram ?? ""}
        />
        <TextField
          id="email"
          label="E-mail de contato"
          onChange={(value) => updateContact({ email: value })}
          placeholder="contato@exemplo.com"
          value={config.contact.email ?? ""}
        />
        <TextAreaField
          id="businessHours"
          label="Horário de funcionamento"
          onChange={(value) => updateContact({ businessHours: value })}
          value={config.contact.businessHours ?? ""}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <Label htmlFor="showMap">Exibir mapa</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Mostra a localização ou um espaço orientando a configuração.
            </p>
          </div>
          <Switch
            checked={config.contact.showMap}
            id="showMap"
            onCheckedChange={(showMap) => updateContact({ showMap })}
          />
        </div>
        <TextAreaField
          id="contactAddress"
          label="Endereço completo"
          onChange={(value) => updateContact({ address: value })}
          value={config.contact.address ?? ""}
        />
        <TextField
          id="mapEmbedUrl"
          label="URL de incorporação do Google Maps"
          onChange={(value) => updateContact({ mapEmbedUrl: value })}
          placeholder="https://www.google.com/maps/embed?..."
          value={config.contact.mapEmbedUrl ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          No Google Maps, use Compartilhar, Incorporar um mapa e copie apenas a
          URL do atributo src.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rodapé
        </h4>
        <DocumentField
          id="footerCnpj"
          label="CNPJ da loja"
          onChange={(cnpj) => updateFooter({ cnpj })}
          value={config.footer.cnpj ?? ""}
        />
        <TextAreaField
          id="footerExtraInfo"
          label="Informação adicional"
          onChange={(extraInfo) => updateFooter({ extraInfo })}
          value={config.footer.extraInfo ?? ""}
        />
      </div>
    </div>
  );
}

function DocumentField({
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
        inputMode="numeric"
        onChange={(event) =>
          onChange(applyInputMask(event.currentTarget, formatBrazilianDocument))
        }
        value={formatBrazilianDocument(value)}
      />
    </div>
  );
}

function PhoneField({
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
        inputMode="tel"
        onChange={(event) =>
          onChange(
            applyInputMask(event.currentTarget, formatBrazilianWhatsappPhone),
          )
        }
        placeholder="+55 (11) 99999-9999"
        type="tel"
        value={formatBrazilianWhatsappPhone(value)}
      />
    </div>
  );
}

function TextField({
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        className="h-10"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        className="min-h-20 resize-y"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        value={value}
      />
    </div>
  );
}
