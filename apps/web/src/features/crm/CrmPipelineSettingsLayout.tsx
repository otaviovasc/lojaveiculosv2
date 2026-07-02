import { useState } from "react";
import { ArrowLeft, Settings, Layers, Waypoints, Shuffle } from "lucide-react";
import { CrmPipelineSettingsGeral } from "./CrmPipelineSettingsGeral";
import { CrmPipelineSettingsEtapas } from "./CrmPipelineSettingsEtapas";
import { CrmPipelineSettingsRoteamento } from "./CrmPipelineSettingsRoteamento";
import { CrmPipelineSettingsDistribucao } from "./CrmPipelineSettingsDistribucao";
import type { Pipeline } from "./crmPipelineStorage";

type SettingsTab = "geral" | "etapas" | "roteamento" | "distribucao";

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
    { id: "roteamento", label: "Roteamento", icon: Waypoints },
    { id: "distribucao", label: "Distribuição", icon: Shuffle },
  ] as const;

  return (
    <div className="crm-settings-page min-h-screen text-app-text flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[240px_1fr] items-stretch">
        {/* Left Sidebar Menu */}
        <aside className="border-r border-line/20 bg-panel/20 p-5 flex flex-col gap-6">
          <button
            className="flex items-center gap-2 text-xs font-bold text-muted hover:text-app-text transition-colors text-left"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="size-3.5" />
            <span>Negócios</span>
          </button>

          <div className="flex items-center justify-between border-b border-line/15 pb-4">
            <h2 className="text-base font-black text-app-text truncate">
              {pipeline.name}
            </h2>
            {pipeline.isDefault && (
              <span className="text-xs font-black uppercase bg-line/35 text-muted px-1.5 py-0.5 rounded border border-line/45">
                Padrão
              </span>
            )}
          </div>

          <nav className="flex flex-col gap-1">
            {sidebarOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeTab === opt.id;
              return (
                <button
                  className={
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all text-left " +
                    (isActive
                      ? "bg-line/20 text-app-text border-l-2 border-accent pl-2.5"
                      : "text-muted hover:text-app-text hover:bg-line/10")
                  }
                  key={opt.id}
                  onClick={() => setActiveTab(opt.id)}
                  type="button"
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Content Pane */}
        <main className="p-8 max-w-4xl">
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
          {activeTab === "roteamento" && (
            <CrmPipelineSettingsRoteamento
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
