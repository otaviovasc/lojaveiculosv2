import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { CrmWhatsappProviderEventIssuesPanel } from "./CrmWhatsappProviderEventIssuesPanel";
import { CrmWhatsappSchedulesPage } from "./CrmWhatsappSchedulesPage";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";

type InboxState = ReturnType<typeof useCrmWhatsappInbox>;

export function WhatsappCampaignsSection({ inbox }: { inbox: InboxState }) {
  return (
    <CrmWhatsappSchedulesPage
      activeSession={inbox.activeSession}
      canCancel={inbox.permissions.canScheduleCancel}
      canCreate={inbox.permissions.canScheduleCreate}
      canProcess={inbox.permissions.canScheduleProcess}
      canRead={inbox.permissions.canScheduleRead}
      connectionId={inbox.connectionId}
      error={inbox.scheduledMessagesError}
      onCancel={inbox.cancelScheduledMessage}
      onList={inbox.listScheduledMessages}
      onProcessDue={inbox.processDueScheduledMessages}
      onSchedule={inbox.createScheduledMessage}
      sessions={inbox.sessions}
    />
  );
}

export function WhatsappIntegrationsSection({
  api,
  canRead,
  canRetry,
}: {
  api: CrmWhatsappApi;
  canRead: boolean;
  canRetry: boolean;
}) {
  return (
    <section className="crm-whatsapp-section">
      <WhatsappSectionIntro
        eyebrow="Integracoes"
        title="Bot externo, webhooks e eventos ZAPI"
      />
      {canRead ? (
        <CrmWhatsappProviderEventIssuesPanel api={api} canRetry={canRetry} />
      ) : null}
      <div className="crm-whatsapp-feature-grid">
        <WhatsappFeatureCard
          body="Acoes do bot externo devem manter o mesmo contrato operacional do Repasses."
          title="Bot actions"
        />
        <WhatsappFeatureCard
          body="Entrada dedicada para Received, Delivery, Status, Connected, Disconnected e Chat Presence."
          title="Webhooks"
        />
        <WhatsappFeatureCard
          body="Eventos externos e reprocessamento ficam aqui, separados da rotina de atendimento."
          title="Eventos"
        />
      </div>
    </section>
  );
}

export function WhatsappVisitsSection() {
  return (
    <section className="crm-whatsapp-section">
      <WhatsappSectionIntro
        eyebrow="Visitas"
        title="Agenda de visitas e test-drives"
      />
      <div className="crm-whatsapp-feature-grid">
        <WhatsappFeatureCard
          body="Reservado para visitas originadas no WhatsApp, confirmacoes e comparecimento."
          title="Visitas"
        />
        <WhatsappFeatureCard
          body="Este espaco evita entupir a conversa com a futura gestao de test-drive."
          title="Operacao da loja"
        />
      </div>
    </section>
  );
}

function WhatsappSectionIntro({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="crm-whatsapp-section-intro">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </header>
  );
}

function WhatsappFeatureCard({ body, title }: { body: string; title: string }) {
  return (
    <article className="crm-whatsapp-feature-card">
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  );
}
