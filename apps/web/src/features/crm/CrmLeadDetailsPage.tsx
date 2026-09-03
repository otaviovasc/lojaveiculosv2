import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Calculator,
  Calendar,
  CheckSquare,
  ChevronDown,
  ExternalLink,
  Folder,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Phone,
  ReceiptText,
  StickyNote,
} from "lucide-react";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import { formatLeadName } from "./crmPipelineModels";
import {
  formatLeadTimelineLabel,
  getLeadStageId,
  getLinkedLeadVehicles,
} from "./crmLeadData";
import { formatCrmPhone } from "./crmPhoneFormat";
import type {
  CrmLeadDetailsPageProps,
  DetailTab,
} from "./CrmPipelineViewTypes";
import { CrmLeadDetailsTabs } from "./CrmLeadDetailsTabs";
import { CrmLeadDetailsSidebar } from "./CrmLeadDetailsSidebar";
import { sourceLabels } from "./crmPipelineConfig";
import { CrmLeadChatModal } from "./CrmLeadChatModal";
import { LeadFinancingSimulationModal } from "./LeadFinancingSimulationModal";
import { LeadSaleModal } from "./LeadSaleModal";
import {
  emptyCrmLeadLinkedRecords,
  loadCrmLeadLinkedRecords,
  type CrmLeadLinkedRecordsState,
} from "./crmLeadLinkedRecords";

export function CrmLeadDetailsPage({
  lead,
  activities,
  stages,
  onBack,
  onMoveLeadPipelineStage,
  onCreateActivity,
  onSetLeadArchived,
  vehicleOptions,
}: CrmLeadDetailsPageProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("visao");
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [activeSaleModalId, setActiveSaleModalId] = useState<string | null>(
    null,
  );
  const [linkedRecords, setLinkedRecords] = useState<CrmLeadLinkedRecordsState>(
    emptyCrmLeadLinkedRecords,
  );
  const stageButtonRef = useRef<HTMLButtonElement>(null);

  const leadName = formatLeadName(lead);
  const activeStageId = getLeadStageId(lead);
  const currentStage = stages.find((s) => s.id === activeStageId) ?? stages[0];
  const leadVehicles = getLinkedLeadVehicles(lead, vehicleOptions);
  const rawPhone = lead.buyerPhone ? lead.buyerPhone.replace(/\D/g, "") : null;

  useEffect(() => {
    let isActive = true;
    setLinkedRecords({ ...emptyCrmLeadLinkedRecords });
    void loadCrmLeadLinkedRecords(lead.id)
      .then((state) => {
        if (isActive) setLinkedRecords(state);
      })
      .catch(() => {
        if (!isActive) return;
        setLinkedRecords({
          documents: [],
          kind: "error",
          message: "Não foi possível carregar vendas e documentos vinculados.",
          sales: [],
        });
      });
    return () => {
      isActive = false;
    };
  }, [lead.id]);

  const handleStageChange = async (stageId: string) => {
    const targetStage = stages.find((s) => s.id === stageId);
    if (!targetStage) return;
    await onMoveLeadPipelineStage(lead.id, targetStage.id);
  };

  const tasksCount = useMemo(
    () => activities.filter((a) => a.activityType === "task").length,
    [activities],
  );
  const meetingsCount = useMemo(
    () => activities.filter((a) => a.activityType === "call").length,
    [activities],
  );
  const notesCount = useMemo(
    () => activities.filter((a) => a.activityType === "note").length,
    [activities],
  );
  const documentsCount = linkedRecords.documents.length;

  const tabs = [
    {
      badge: undefined,
      icon: LayoutDashboard,
      id: "visao" as const,
      label: "Visão geral",
    },
    {
      badge: undefined,
      icon: MessageSquare,
      id: "chat" as const,
      label: "Chat",
    },
    {
      badge: tasksCount > 0 ? tasksCount : undefined,
      icon: CheckSquare,
      id: "tarefas" as const,
      label: "Tarefas",
    },
    {
      badge: meetingsCount > 0 ? meetingsCount : undefined,
      icon: Calendar,
      id: "reunioes" as const,
      label: "Reuniões",
    },
    {
      badge: notesCount > 0 ? notesCount : undefined,
      icon: StickyNote,
      id: "notas" as const,
      label: "Notas",
    },
    {
      badge: documentsCount > 0 ? documentsCount : undefined,
      icon: Folder,
      id: "arquivos" as const,
      label: "Arquivos",
    },
    {
      badge: undefined,
      icon: Calculator,
      id: "financeiro" as const,
      label: "Financiamento",
    },
  ];

  return (
    <div className="crm-client-detail flex flex-col gap-5 text-app-text select-none w-full min-w-0 max-w-full">
      {/* Top Header Row */}
      <header className="flex items-center justify-between py-3 border-b border-line/15 flex-wrap sm:flex-nowrap gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            aria-label="Voltar para clientes"
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-muted hover:text-app-text hover:bg-line/15 transition-colors cursor-pointer shrink-0"
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-app-text uppercase tracking-wide leading-none truncate">
                {leadName}
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-line/20 text-muted">
                {sourceLabels[lead.source] || "Lead"}
              </span>
            </div>
            {lead.buyerPhone ? (
              <span className="text-xs font-bold text-muted mt-1 truncate flex items-center gap-1.5">
                <Phone className="size-3 text-muted/70 shrink-0" />
                {formatCrmPhone(lead.buyerPhone)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            aria-label={`Abrir chat de ${leadName} no CRM`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 text-xs font-black text-primary transition-all hover:bg-primary/20 cursor-pointer"
            onClick={() => setIsChatModalOpen(true)}
            title="Abrir conversa no CRM"
            type="button"
          >
            <MessageSquare aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Chat CRM</span>
          </button>

          <button
            aria-label={`Simular financiamento para ${leadName}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line/35 bg-panel/40 px-3 text-xs font-bold text-muted transition-colors hover:bg-line/10 hover:text-app-text cursor-pointer"
            onClick={() => setIsSimulationModalOpen(true)}
            title="Simular financiamento Credere"
            type="button"
          >
            <Landmark aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Simular</span>
          </button>

          <button
            aria-label={`Iniciar venda para ${leadName}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line/35 bg-panel/40 px-3 text-xs font-bold text-muted transition-colors hover:bg-line/10 hover:text-app-text cursor-pointer"
            onClick={() => setActiveSaleModalId("new")}
            title="Iniciar venda para este cliente"
            type="button"
          >
            <ReceiptText aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Venda</span>
          </button>

          {rawPhone ? (
            <a
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line/35 bg-panel/40 px-3 text-xs font-bold text-muted transition-colors hover:bg-line/10 hover:text-app-text"
              href={`https://wa.me/${rawPhone}`}
              rel="noreferrer"
              target="_blank"
              title="Abrir WhatsApp Web"
            >
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span className="hidden md:inline">WhatsApp Web</span>
            </a>
          ) : null}

          <button
            aria-label={
              lead.status === "archived" ? "Restaurar lead" : "Arquivar lead"
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line/35 bg-panel/40 px-3 text-xs font-bold text-muted transition-colors hover:bg-line/10 hover:text-app-text"
            onClick={() =>
              void onSetLeadArchived(lead.id, lead.status !== "archived")
            }
            title={
              lead.status === "archived" ? "Restaurar lead" : "Arquivar lead"
            }
            type="button"
          >
            {lead.status === "archived" ? (
              <ArchiveRestore aria-hidden="true" className="size-4" />
            ) : (
              <Archive aria-hidden="true" className="size-4" />
            )}
            <span className="hidden sm:inline">
              {lead.status === "archived" ? "Restaurar" : "Arquivar"}
            </span>
          </button>

          <span className="rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-black text-warning-strong">
            {formatLeadTimelineLabel(lead)}
          </span>

          <div className="relative">
            <button
              aria-controls="crm-lead-stage-menu"
              aria-expanded={isStageDropdownOpen}
              aria-haspopup="menu"
              aria-label={`Alterar fase de ${leadName}`}
              onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
              ref={stageButtonRef}
              className="inline-flex h-9 items-center justify-between gap-2.5 rounded-lg border border-line/35 bg-panel/40 pl-3.5 pr-3 text-xs font-bold text-app-text outline-none hover:bg-line/10 cursor-pointer transition-colors min-w-[140px]"
              type="button"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: currentStage?.color || "transparent",
                  }}
                />
                <span className="font-extrabold">
                  {currentStage?.name || "Novo Lead"}
                </span>
              </div>
              <ChevronDown
                aria-hidden="true"
                className={`size-3.5 text-muted shrink-0 icon-rotate-on-open ${
                  isStageDropdownOpen ? "is-open" : ""
                }`}
              />
            </button>

            <FeatureAnchoredPopover
              align="end"
              anchorRef={stageButtonRef}
              className="flex w-48 flex-col gap-0.5"
              id="crm-lead-stage-menu"
              isOpen={isStageDropdownOpen}
              offset={4}
              onClose={() => setIsStageDropdownOpen(false)}
            >
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    void handleStageChange(s.id);
                    setIsStageDropdownOpen(false);
                  }}
                  className={
                    "w-full text-left px-3.5 py-2 text-xs font-bold transition-colors hover:bg-line/15 flex items-center justify-between cursor-pointer rounded-md " +
                    (activeStageId === s.id
                      ? "bg-line/15 text-app-text font-black"
                      : "text-muted hover:text-app-text")
                  }
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color || "transparent" }}
                    />
                    <span>{s.name}</span>
                  </div>
                  {activeStageId === s.id && (
                    <span className="size-1.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </FeatureAnchoredPopover>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-6 items-start w-full min-w-0 max-w-full">
        {/* Left Column Workspace */}
        <div className="flex flex-col gap-4 min-w-0 w-full max-w-full">
          {/* Tabs row bar */}
          <div
            aria-label="Seções do cliente"
            className="custom-scrollbar flex items-center gap-1.5 overflow-x-auto py-1.5 px-0.5 border-b border-line/15 w-full min-w-0 max-w-full touch-pan-x"
            role="tablist"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  aria-selected={isActive}
                  className={
                    "inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer shrink-0 " +
                    (isActive
                      ? "bg-panel text-app-text border border-line/40 font-black"
                      : "text-muted hover:text-app-text hover:bg-line/10")
                  }
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DetailTab)}
                  role="tab"
                  type="button"
                >
                  <tab.icon
                    aria-hidden="true"
                    className={
                      isActive ? "size-3.5 text-primary" : "size-3.5 text-muted"
                    }
                  />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined ? (
                    <span
                      className={
                        isActive
                          ? "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-black bg-primary/15 text-primary"
                          : "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-black bg-line/20 text-muted"
                      }
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Tab Subviews Content wrapper */}
          <div
            className="py-1 crm-tab-panel w-full min-w-0 max-w-full"
            key={activeTab}
          >
            <CrmLeadDetailsTabs
              activeTab={activeTab}
              activities={activities}
              lead={lead}
              linkedRecords={linkedRecords}
              stages={stages}
              onCreateActivity={onCreateActivity}
              vehicleOptions={vehicleOptions}
              onOpenChatModal={() => setIsChatModalOpen(true)}
              onOpenSimulationModal={() => setIsSimulationModalOpen(true)}
              onOpenSaleModal={(saleId) =>
                setActiveSaleModalId(saleId ?? "new")
              }
            />
          </div>
        </div>

        {/* Right Widgets Sidebar Component */}
        <CrmLeadDetailsSidebar
          lead={lead}
          leadName={leadName}
          activities={activities}
          leadVehicles={leadVehicles}
          onCreateActivity={onCreateActivity}
          onOpenChatModal={() => setIsChatModalOpen(true)}
        />
      </div>

      {isChatModalOpen && (
        <CrmLeadChatModal
          lead={lead}
          onClose={() => setIsChatModalOpen(false)}
          onStartSale={() => setActiveSaleModalId("new")}
        />
      )}

      {isSimulationModalOpen && (
        <LeadFinancingSimulationModal
          lead={lead}
          onClose={() => setIsSimulationModalOpen(false)}
          vehicleOptions={vehicleOptions}
        />
      )}

      {activeSaleModalId && (
        <LeadSaleModal
          lead={lead}
          onClose={() => {
            setActiveSaleModalId(null);
            void loadCrmLeadLinkedRecords(lead.id).then(setLinkedRecords);
          }}
          saleId={activeSaleModalId === "new" ? null : activeSaleModalId}
        />
      )}
    </div>
  );
}
