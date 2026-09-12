import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type {
  Pipeline,
  PipelineStage,
  PipelineStageDraft,
} from "./crmPipelineStorage";
import type { ProductCrmLead } from "./productCrmTypes";
import type { LeadCreateDraft } from "./crmPipelineModels";
import type { FinancingSimulationDraft } from "./crmLeadData";
import type { CrmLeadImportInput, CrmLeadImportResult } from "./productCrmApi";
import { CrmSimulationModal } from "./CrmSimulationModal";
import { CrmQuickAddLeadModal } from "./CrmQuickAddLeadModal";
import { CrmQuickAddPipelineModal } from "./CrmQuickAddPipelineModal";
import { CrmQuickAddStageModal } from "./CrmQuickAddStageModal";
import { CrmEditStageModal } from "./CrmEditStageModal";
import { CrmLeadChatModal } from "./CrmLeadChatModal";
import { CrmLeadCsvImportDialog } from "./CrmLeadCsvImportDialog";
import { Toast, type ToastTone } from "../../components/ui/Toast";

export type CrmPipelineModalsProps = {
  activePipeline: Pipeline | null;
  vehicleOptions: LeadVehicleOption[];
  simulateLead: ProductCrmLead | null;
  onCloseSimulate: () => void;
  onSaveSimulation: (
    leadId: string,
    data: FinancingSimulationDraft,
  ) => Promise<void>;
  quickAddLeadStageId: string | null;
  onCloseQuickAddLead: () => void;
  onQuickAddCreateLead: (draft: LeadCreateDraft) => Promise<void>;
  isQuickPipelineOpen: boolean;
  onCloseQuickPipeline: () => void;
  onCreatePipelineConfirm: (
    name: string,
    stages?: PipelineStageDraft[],
  ) => void;
  isQuickStageOpen: boolean;
  onCloseQuickStage: () => void;
  onAddStageConfirm: (name: string, color: string, slaDays: number) => void;
  editingStage: PipelineStage | null;
  onCloseEditStage: () => void;
  onUpdateStageInfo: (
    name: string,
    color: string,
    slaDays: number | null,
  ) => void;
  chatLead: ProductCrmLead | null;
  onCloseChatLead: () => void;
  onConversationStarted: () => void;
  isImportOpen: boolean;
  onCloseImport: () => void;
  onImportLeads?:
    ((input: CrmLeadImportInput) => Promise<CrmLeadImportResult>) | undefined;
  onImportSuccess: () => void;
  toast: { title: string; children?: string; tone: ToastTone } | null;
  onDismissToast: () => void;
};

export function CrmPipelineModals({
  activePipeline,
  vehicleOptions,
  simulateLead,
  onCloseSimulate,
  onSaveSimulation,
  quickAddLeadStageId,
  onCloseQuickAddLead,
  onQuickAddCreateLead,
  isQuickPipelineOpen,
  onCloseQuickPipeline,
  onCreatePipelineConfirm,
  isQuickStageOpen,
  onCloseQuickStage,
  onAddStageConfirm,
  editingStage,
  onCloseEditStage,
  onUpdateStageInfo,
  chatLead,
  onCloseChatLead,
  onConversationStarted,
  isImportOpen,
  onCloseImport,
  onImportLeads,
  onImportSuccess,
  toast,
  onDismissToast,
}: CrmPipelineModalsProps) {
  return (
    <>
      {simulateLead && (
        <CrmSimulationModal
          lead={simulateLead}
          onClose={onCloseSimulate}
          onSaveSimulation={onSaveSimulation}
          vehicleOptions={vehicleOptions}
        />
      )}

      {quickAddLeadStageId && activePipeline && (
        <CrmQuickAddLeadModal
          onClose={onCloseQuickAddLead}
          onCreateLead={onQuickAddCreateLead}
          stageId={quickAddLeadStageId}
          stages={activePipeline.stages}
          vehicleOptions={vehicleOptions}
        />
      )}

      {isQuickPipelineOpen && (
        <CrmQuickAddPipelineModal
          onClose={onCloseQuickPipeline}
          onCreatePipeline={onCreatePipelineConfirm}
        />
      )}

      {isQuickStageOpen && (
        <CrmQuickAddStageModal
          onAddStage={onAddStageConfirm}
          onClose={onCloseQuickStage}
        />
      )}

      {editingStage && (
        <CrmEditStageModal
          onClose={onCloseEditStage}
          onSave={onUpdateStageInfo}
          stage={editingStage}
        />
      )}

      {chatLead && (
        <CrmLeadChatModal
          lead={chatLead}
          onClose={onCloseChatLead}
          onConversationStarted={onConversationStarted}
        />
      )}

      {isImportOpen && activePipeline && onImportLeads && (
        <CrmLeadCsvImportDialog
          initialStageId={activePipeline.stages[0]?.id}
          isOpen={isImportOpen}
          onClose={onCloseImport}
          onImport={onImportLeads}
          onSuccess={onImportSuccess}
          stages={activePipeline.stages}
        />
      )}

      {toast ? (
        <Toast
          durationMs={4000}
          onDismiss={onDismissToast}
          title={toast.title}
          tone={toast.tone}
        >
          {toast.children}
        </Toast>
      ) : null}
    </>
  );
}
