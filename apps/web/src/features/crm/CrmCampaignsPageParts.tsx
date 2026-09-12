import {
  AlertCircle,
  Clock,
  Megaphone,
  MessageSquareReply,
  Send,
  Users,
} from "lucide-react";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { CrmCampaignImagePicker } from "./CrmCampaignImagePicker";
import { CAMPAIGN_IMAGE_CAPTION_MAX_LENGTH } from "./crmCampaignMedia";
import type { CrmCampaign } from "./crmCampaignTypes";

export function CampaignStats({ campaigns }: { campaigns: CrmCampaign[] }) {
  return (
    <div className="crm-campaign-stats">
      {summarizeCampaigns(campaigns).map((item) => {
        const Icon = item.icon;
        return (
          <div className="crm-campaign-stat-card" key={item.label}>
            <div className="crm-campaign-stat-top">
              <span>{item.label}</span>
              <Icon aria-hidden="true" className="crm-campaign-stat-icon" />
            </div>
            <strong>{item.value}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function CampaignMessagePanel({
  canCreate,
  campaignName,
  canUseImage,
  imageError,
  imageFile,
  isSaving,
  onCampaignNameChange,
  onImageError,
  onImageRemove,
  onImageSelect,
  onTextChange,
  text,
}: {
  canCreate: boolean;
  campaignName: string;
  canUseImage: boolean;
  imageError: string | null;
  imageFile: File | null;
  isSaving: boolean;
  onCampaignNameChange: (value: string) => void;
  onImageError: (error: string | null) => void;
  onImageRemove: () => void;
  onImageSelect: (file: File) => void;
  onTextChange: (value: string) => void;
  text: string;
}) {
  const hasImage = Boolean(imageFile);
  const textLimit = hasImage ? CAMPAIGN_IMAGE_CAPTION_MAX_LENGTH : 4000;
  return (
    <section className="crm-campaign-panel">
      <h3>Mensagem e ritmo</h3>
      <FeatureField label="Nome da campanha">
        <FeatureInput
          aria-label="Nome da campanha"
          disabled={!canCreate || isSaving}
          maxLength={191}
          onChange={(event) => onCampaignNameChange(event.target.value)}
          value={campaignName}
        />
      </FeatureField>
      <FeatureField
        hint={`${text.length}/${textLimit} caracteres · Use {nome} para personalizar.`}
        label={hasImage ? "Legenda da imagem" : "Mensagem inicial"}
      >
        <FeatureTextarea
          aria-label={hasImage ? "Legenda da imagem" : "Mensagem inicial"}
          disabled={!canCreate || isSaving}
          maxLength={textLimit}
          onChange={(event) => onTextChange(event.target.value)}
          rows={7}
          value={text}
        />
      </FeatureField>
      {canUseImage ? (
        <CrmCampaignImagePicker
          disabled={!canCreate || isSaving}
          error={imageError}
          file={imageFile}
          onError={onImageError}
          onRemove={onImageRemove}
          onSelect={onImageSelect}
        />
      ) : null}
      <p>
        A variável <code>{"{nome}"}</code> usa o nome da conversa ou “cliente”
        quando essa informação não estiver disponível.
      </p>
    </section>
  );
}

function summarizeCampaigns(campaigns: CrmCampaign[]) {
  const totals = campaigns.reduce(
    (acc, campaign) => ({
      failed: acc.failed + campaign.failedCount,
      recipients: acc.recipients + campaign.totalRecipients,
      replied: acc.replied + campaign.repliedCount,
      scheduled: acc.scheduled + campaign.scheduledCount,
      sent: acc.sent + campaign.sentCount,
    }),
    { failed: 0, recipients: 0, replied: 0, scheduled: 0, sent: 0 },
  );
  const replyRate =
    totals.sent > 0
      ? `${Math.round((totals.replied / totals.sent) * 100)}%`
      : "0%";
  return [
    { icon: Megaphone, label: "Campanhas", value: campaigns.length },
    { icon: Users, label: "Destinatarios", value: totals.recipients },
    { icon: Clock, label: "Agendadas", value: totals.scheduled },
    { icon: Send, label: "Enviadas", value: totals.sent },
    { icon: AlertCircle, label: "Falhas", value: totals.failed },
    { icon: MessageSquareReply, label: "Resposta", value: replyRate },
  ];
}
