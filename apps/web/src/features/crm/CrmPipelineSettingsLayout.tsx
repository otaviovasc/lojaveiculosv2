import { useState } from "react";
import { ArrowLeft, Settings, Layers, Shuffle } from "lucide-react";
import { CrmPipelineSettingsGeral } from "./CrmPipelineSettingsGeral";
import { CrmPipelineSettingsEtapas } from "./CrmPipelineSettingsEtapas";
import { CrmPipelineSettingsDistribucao } from "./CrmPipelineSettingsDistribucao";
import type { Pipeline } from "./crmPipelineStorage";

type SettingsTab = "geral" | "etapas" | "distribucao";

type Props = {
  pipeline: Pipeline;
  onBack: () => void;
  onUpdatePipeline: (updated: Pipeline) => void;
  onDeletePipeline: (pipelineId: string) => void;
};

export function CrmPipelineSettingsLayout({
  pipeline,
  onBack,
  onUpdatePipeline,
  onDeletePipeline,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("geral");

  const sidebarOptions = [
    { id: "geral", label: "Geral", icon: Settings },
    { id: "etapas", label: "Etapas", icon: Layers },
    { id: "distribucao", label: "Distribuição", icon: Shuffle },
  ] as const;

  return (
    <div className="crm-settings-page min-h-screen text-app-text flex flex-col w-full min-w-0 max-w-full">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[240px_1fr] items-stretch w-full min-w-0">
        {/* Left Sidebar / Top Nav Menu */}
        <aside className="border-b md:border-b-0 md:border-r border-line/20 bg-panel/20 p-4 sm:p-5 flex flex-col gap-4 sm:gap-6 w-full min-w-0">
          <button
            className="flex items-center gap-2 text-xs font-bold text-muted hover:text-app-text transition-colors text-left"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="size-3.5" />
            <span>Negócios</span>
          </button>

          <div className="flex items-center justify-between border-b border-line/15 pb-3 sm:pb-4 min-w-0">
            <h2 className="text-base font-black text-app-text truncate">
              {pipeline.name}
            </h2>
            {pipeline.isDefault && (
              <span className="text-xs font-black uppercase bg-line/35 text-muted px-1.5 py-0.5 rounded border border-line/45 shrink-0">
                Padrão
              </span>
            )}
          </div>

          <nav
            aria-label="Abas de configuração"
            className="flex flex-row md:flex-col gap-1 overflow-x-auto custom-scrollbar touch-pan-x py-1"
            role="tablist"
          >
            {sidebarOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeTab === opt.id;
              return (
                <button
                  aria-selected={isActive}
                  className={
                    "flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all text-left group cursor-pointer active:scale-[0.98] shrink-0 md:shrink md:w-full " +
                    (isActive
                      ? "bg-line/20 text-app-text border-l-2 border-accent pl-2.5 font-black"
                      : "text-muted hover:text-app-text hover:bg-line/10 hover:translate-x-0.5")
                  }
                  key={opt.id}
                  onClick={() => setActiveTab(opt.id)}
                  role="tab"
                  type="button"
                >
                  <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Content Pane */}
        <main
          className="p-4 sm:p-6 md:p-8 w-full min-w-0 max-w-full md:max-w-5xl crm-tab-panel"
          key={activeTab}
        >
          {activeTab === "geral" && (
            <CrmPipelineSettingsGeral
              onDelete={onDeletePipeline}
              onUpdate={onUpdatePipeline}
              pipeline={pipeline}
            />
          )}
          {activeTab === "etapas" && (
            <CrmPipelineSettingsEtapas
              onUpdate={onUpdatePipeline}
              pipeline={pipeline}
            />
          )}
          {activeTab === "distribucao" && (
            <CrmPipelineSettingsDistribucao
              onUpdate={onUpdatePipeline}
              pipeline={pipeline}
            />
          )}
        </main>
      </div>
    </div>
  );
}
