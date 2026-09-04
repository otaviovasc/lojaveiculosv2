import { Megaphone, Plus, Sparkles } from "lucide-react";

export function CampaignModeBar({
  campaignCount,
  canCreate,
  lastResult,
  mode,
  onCreate,
}: {
  campaignCount: number;
  canCreate: boolean;
  lastResult: string | null;
  mode: "create" | "overview";
  onCreate: () => void;
}) {
  return (
    <header className="crm-campaign-hero-card">
      <span aria-hidden="true" className="crm-campaign-hero-icon">
        <Megaphone />
      </span>
      <div className="crm-campaign-hero-content">
        <div className="crm-campaign-hero-main">
          <span className="crm-campaign-hero-eyebrow">
            {mode === "overview"
              ? "Marketing e relacionamento"
              : "Assistente de criação"}
          </span>
          <h2>
            {mode === "overview" ? "Campanhas de mensagens" : "Nova campanha"}
          </h2>
          <p>
            {mode === "overview"
              ? "Organize disparos em massa, acompanhe entregas e identifique respostas em um só lugar."
              : "Defina o público, a mensagem e o ritmo antes de confirmar o agendamento."}
          </p>
        </div>
        <div className="crm-campaign-hero-actions">
          {mode === "overview" ? (
            <>
              <span className="crm-campaign-count-badge">
                <Megaphone
                  aria-hidden="true"
                  className="size-3.5 text-emerald-600"
                />
                <span>
                  {lastResult ??
                    `${campaignCount} ${campaignCount === 1 ? "campanha" : "campanhas"}`}
                </span>
              </span>
              {canCreate ? (
                <button
                  className="crm-action crm-campaign-create-btn"
                  onClick={onCreate}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  <span>Nova campanha</span>
                </button>
              ) : null}
            </>
          ) : (
            <span className="crm-campaign-count-badge">
              <Sparkles
                aria-hidden="true"
                className="size-3.5 text-emerald-600"
              />
              <span>Rascunho salvo automaticamente</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
