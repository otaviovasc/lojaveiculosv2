import { ArrowRight, CalendarDays, Clock, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ModuleId } from "../app/modules";
import {
  DASHBOARD_RESOURCE_PRESENCE_INITIAL,
  DASHBOARD_RESOURCE_PRESENCE_MODE,
  DASHBOARD_RESOURCE_SLIDE_CLASS,
  DASHBOARD_RESOURCE_SLIDE_TRANSITION,
  dashboardResources,
  getDashboardEntryMotion,
  getDashboardResource,
} from "../features/analytics/dashboardHomeAnimation";
import type { AnalyticsDashboard } from "../features/analytics/types";
import { DashboardLeadSourcesPanel } from "./DashboardLeadSourcesPanel";
import { MOCK_AGING_VEHICLES, MOCK_TASKS } from "./DashboardHomeData";
import {
  AgingStat,
  getPromoBlobClass,
  PanelHeader,
} from "./DashboardHomePanelParts";

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
        <DashboardAgendaPanel />
        <DashboardLeadSourcesPanel dashboard={dashboard} />
      </div>
      <DashboardPromoBanner
        resourceIndex={resourceIndex}
        setResourceIndex={setResourceIndex}
      />
      <DashboardAgingInventory onNavigate={onNavigate} />
    </div>
  );
}

function DashboardAgendaPanel() {
  return (
    <motion.div
      {...getDashboardEntryMotion(0.4)}
      whileHover={{ y: -4 }}
      className="glass-panel-branded dashboard-card"
    >
      <PanelHeader
        icon={<CalendarDays className="size-5" />}
        iconClass="card-header-icon-blue"
        title="Agenda Próxima"
      />
      <div className="card-body">
        {MOCK_TASKS.map((task) => {
          const date = new Date(task.dueDate);
          return (
            <div key={task.id} className="agenda-item-premium">
              <div
                className={
                  "agenda-date-box-premium " +
                  (task.isOverdue
                    ? "agenda-date-box-danger"
                    : "agenda-date-box-accent")
                }
              >
                <span className="agenda-date-month">
                  {date
                    .toLocaleDateString("pt-BR", { month: "short" })
                    .replace(".", "")}
                </span>
                <span className="agenda-date-day">{date.getDate()}</span>
              </div>
              <div className="agenda-item-info">
                <h4 className="agenda-item-title">{task.title}</h4>
                <div className="agenda-item-meta">
                  <span className="agenda-item-meta-lead">{task.leadName}</span>
                  {task.columnName && (
                    <span className="agenda-badge-muted">
                      {task.columnName}
                    </span>
                  )}
                  {task.isOverdue && (
                    <span className="agenda-badge-danger">Atrasada</span>
                  )}
                </div>
              </div>
              <ArrowRight className="agenda-item-arrow" />
            </div>
          );
        })}
      </div>
    </motion.div>
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
    <motion.div {...getDashboardEntryMotion(0.5)} className="promo-banner">
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
          <div className="flex items-start justify-between">
            <div>
              <span className="promo-banner-tag">{currentResource.tag}</span>
              <h4 className="promo-banner-title">{currentResource.title}</h4>
            </div>
            <div className="promo-banner-icon-container">
              <Sparkles className="size-5 text-white/90 animate-pulse" />
            </div>
          </div>
          <p className="promo-banner-desc">{currentResource.desc}</p>
          <div className="promo-banner-footer">
            <div className="promo-banner-dots">
              {dashboardResources.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setResourceIndex(i);
                  }}
                  className={`carousel-dot ${i === resourceIndex ? "carousel-dot-active" : ""}`}
                  aria-label={`Mostrar slide ${i + 1}`}
                  type="button"
                />
              ))}
            </div>
            <button className="promo-banner-btn">
              <span>Saiba Mais</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function DashboardAgingInventory({
  onNavigate,
}: {
  onNavigate: (moduleId: ModuleId) => void;
}) {
  return (
    <motion.div
      {...getDashboardEntryMotion(0.55)}
      whileHover={{ y: -4 }}
      className="glass-panel-branded dashboard-card"
    >
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
          <span className="aging-avg-label">Médio:</span>
          <span className="aging-avg-value">35 dias</span>
        </div>
      </div>
      <div className="aging-inventory-grid">
        {MOCK_AGING_VEHICLES.map((vehicle) => (
          <div key={vehicle.id} className="aging-item-premium group">
            <div className="aging-img-wrapper">
              {vehicle.foto ? (
                <img
                  src={vehicle.foto}
                  alt={vehicle.title}
                  className="aging-img"
                />
              ) : (
                <div className="w-full h-full bg-app-elevated" />
              )}
              <div className="aging-days-badge">{vehicle.daysInStock}d</div>
            </div>
            <div className="aging-details">
              <h4 className="aging-title">{vehicle.title}</h4>
              <div className="aging-stats">
                <AgingStat label="Leads" value={vehicle.leadsCount} />
                <div className="aging-stat-divider" />
                <AgingStat
                  label="Preço"
                  value={new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(vehicle.price)}
                  valueClassName="aging-stat-value-green"
                />
              </div>
              <button
                onClick={() => onNavigate("inventory")}
                className="aging-action-btn"
              >
                Ver Detalhes
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
