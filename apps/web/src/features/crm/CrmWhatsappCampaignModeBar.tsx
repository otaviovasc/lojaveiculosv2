import { Megaphone, Plus } from "lucide-react";
import { CrmWhatsappModeBar } from "./CrmWhatsappWorkflow";

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
    <CrmWhatsappModeBar
      actions={
        mode === "overview" && canCreate ? (
          <button
            className="crm-action crm-action-primary"
            onClick={onCreate}
            type="button"
          >
            <Plus aria-hidden="true" />
            Nova campanha
          </button>
        ) : null
      }
      summary={
        mode === "overview"
          ? (lastResult ?? `${campaignCount} campanha(s)`)
          : "Rascunho salvo enquanto voce navega entre as etapas"
      }
    >
      <span className="crm-whatsapp-mode-label">
        <Megaphone aria-hidden="true" />
        {mode === "overview" ? "Operacao de campanhas" : "Nova campanha"}
      </span>
    </CrmWhatsappModeBar>
  );
}
