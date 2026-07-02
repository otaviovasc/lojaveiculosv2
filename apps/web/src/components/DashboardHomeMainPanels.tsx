import { ArrowRight, CalendarDays, Clock, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ModuleId } from "../app/modules";
import {
  DASHBOARD_RESOURCE_PRESENCE_INITIAL,
  DASHBOARD_RESOURCE_PRESENCE_MODE,
  DASHBOARD_RESOURCE_SLIDE_CLASS,
  DASHBOARD_RESOURCE_SLIDE_TRANSITION,
  dashboardResources,
  getDashboardResource,
} from "../features/analytics/dashboardHomeAnimation";
import type { AnalyticsDashboard } from "../features/analytics/types";
import { DashboardHomeEntry } from "./DashboardHomeEntry";
import { DashboardLeadSourcesPanel } from "./DashboardLeadSourcesPanel";
import { getPromoBlobClass, PanelHeader } from "./DashboardHomePanelParts";
import BorderGlow from "./ui/BorderGlow";

export function DashboardHomeMainPanels({
  dashboard,
  onNavigate,
  resourceIndex,
  setResourceIndex,
}: {
  dashboard: AnalyticsDashboard | null;
  onNavigate: (moduleId: ModuleId) => void;
  resourceIndex: number;
  setResourceIndex: (index: number) => void;
}) {
  return (
    <div className="dashboard-main-col">
      <div className="dashboard-sub-grid">
        <DashboardAgendaPanel dashboard={dashboard} />
        <DashboardLeadSourcesPanel dashboard={dashboard} />
      </div>
      <DashboardPromoBanner
        resourceIndex={resourceIndex}
        setResourceIndex={setResourceIndex}
      />
      <DashboardAgingInventory dashboard={dashboard} onNavigate={onNavigate} />
    </div>
  );
}

function DashboardAgendaPanel({
  dashboard,
}: {
  dashboard: AnalyticsDashboard | null;
}) {
  const activeLeads =
    dashboard?.leadFunnel.reduce((total, step) => total + step.count, 0) ?? 0;

  return (
    <DashboardHomeEntry className="h-full" delay={0.14}>
      <div className="glass-panel-branded dashboard-card">
        <PanelHeader
          icon={<CalendarDays className="size-5" />}
          iconClass="card-header-icon-blue"
          title="Agenda Próxima"
        />
        <div className="card-body">
          <DashboardPanelEmpty
            title={
              activeLeads > 0
                ? "Nenhuma agenda pendente"
                : "Nenhuma atividade pendente"
            }
            body={
              activeLeads > 0
                ? `${activeLeads} leads ativos sem compromisso aberto.`
                : "A rotina comercial desta loja ainda não gerou compromissos."
            }
          />
        </div>
      </div>
    </DashboardHomeEntry>
  );
}

function DashboardPromoBanner({
  resourceIndex,
  setResourceIndex,
}: {
  resourceIndex: number;
  setResourceIndex: (index: number) => void;
}) {
  const currentResource = getDashboardResource(resourceIndex);
  const primaryBlobClass = getPromoBlobClass(resourceIndex, "primary");
  const secondaryBlobClass = getPromoBlobClass(resourceIndex, "secondary");

  return (
    <DashboardHomeEntry className="w-full" delay={0.18}>
      <BorderGlow
        edgeSensitivity={30}
        glowColor="40 80 80"
        backgroundColor="var(--promo-banner-bg)"
        borderRadius={24}
        glowRadius={40}
        glowIntensity={1.0}
        coneSpread={25}
        animated={true}
        colors={[
          "var(--color-violet-start)",
          "var(--color-pink-start)",
          "var(--color-blue-start)",
        ]}
      >
        <div
          className="promo-banner"
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
          }}
        >
          <div className="promo-banner-glow-container">
            <div className="promo-banner-blob-wrapper promo-banner-blob-1-pos animate-blob-1">
              <div className={primaryBlobClass} />
            </div>
            <div className="promo-banner-blob-wrapper promo-banner-blob-2-pos animate-blob-2">
              <div className={secondaryBlobClass} />
            </div>
          </div>
          <AnimatePresence
            initial={DASHBOARD_RESOURCE_PRESENCE_INITIAL}
            mode={DASHBOARD_RESOURCE_PRESENCE_MODE}
          >
            <motion.div
              key={resourceIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={DASHBOARD_RESOURCE_SLIDE_TRANSITION}
              className={`${DASHBOARD_RESOURCE_SLIDE_CLASS} ${currentResource.panelClass}`}
            >
              {/* Background Image */}
              <img
                src={currentResource.imagePath}
                alt=""
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
              />

              {/* Dark gradient overlay for visual separation and readability */}
              <div className="promo-banner-overlay" />

              {/* Content Column: Tag, Title, Description, Button */}
              <div className="flex flex-col items-start text-left relative z-10 w-full">
                <span className="promo-banner-tag">{currentResource.tag}</span>
                <h4 className="promo-banner-title mt-3.5">
                  {currentResource.title}
                </h4>
                <p className="promo-banner-desc max-w-[65%] mt-2">
                  {currentResource.desc}
                </p>
                <button className="promo-banner-btn mt-4">
                  <span>{currentResource.buttonLabel}</span>
                  <ArrowRight className="size-3" />
                </button>
              </div>

              {/* Footer: Carousel Dots */}
              <div className="promo-banner-footer relative z-10 flex items-center justify-between w-full mt-auto">
                <div className="promo-banner-dots">
                  {dashboardResources.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setResourceIndex(i);
                      }}
                      className={`carousel-dot ${
                        i === resourceIndex ? "carousel-dot-active" : ""
                      }`}
                      aria-label={`Mostrar slide ${i + 1}`}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </BorderGlow>
    </DashboardHomeEntry>
  );
}

function DashboardAgingInventory({
  dashboard,
  onNavigate,
}: {
  dashboard: AnalyticsDashboard | null;
  onNavigate: (moduleId: ModuleId) => void;
}) {
  const inventory = dashboard?.inventory;
  const totalListings = inventory?.totalListings ?? 0;
  const availableListings = inventory?.availableListings ?? 0;
  const hasInventory = totalListings > 0;

  return (
    <DashboardHomeEntry className="h-full" delay={0.2}>
      <div className="glass-panel-branded dashboard-card">
        <div className="card-header card-header-gradient">
          <div className="card-header-title-container">
            <div className="card-header-icon card-header-icon-amber">
              <Clock className="size-5.5" />
            </div>
            <div>
              <h3 className="card-header-title">Maior Tempo em Pátio</h3>
              <p className="text-xs text-muted font-bold">
                Veículos prioritários para giro comercial
              </p>
            </div>
          </div>
          <div className="aging-avg-badge">
            <span className="aging-avg-label">Estoque:</span>
            <span className="aging-avg-value">
              {availableListings}/{totalListings}
            </span>
          </div>
        </div>
        <div className="aging-inventory-grid">
          <div className="col-span-full rounded-xl border border-dashed border-line/70 bg-app/40 p-5">
            <div className="flex flex-col gap-3">
              <h4 className="aging-title">
                {hasInventory
                  ? "Prioridades de giro em preparação"
                  : "Nenhum veículo nesta loja"}
              </h4>
              <p className="text-sm font-bold text-muted">
                {hasInventory
                  ? `${totalListings} veículos cadastrados. Revise o estoque para acompanhar giro, leads e precificação.`
                  : "Cadastre o primeiro veículo para iniciar indicadores comerciais desta loja."}
              </p>
              <button
                onClick={() => onNavigate("inventory")}
                className="aging-action-btn max-w-max"
                type="button"
              >
                {hasInventory ? "Abrir estoque" : "Cadastrar veículo"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardHomeEntry>
  );
}

function DashboardPanelEmpty({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line/70 bg-app/40 p-5">
      <h4 className="agenda-item-title">{title}</h4>
      <p className="mt-2 text-sm font-bold text-muted">{body}</p>
    </div>
  );
}
