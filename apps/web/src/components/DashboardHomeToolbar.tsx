import { Check, Copy, Eye } from "lucide-react";
import { DashboardHomeEntry } from "./DashboardHomeEntry";
import { DatePickerField } from "./ui/DatePickerField";

export function DashboardHomeToolbar({
  copyState,
  onCopyLink,
  onVisitStore,
  publicSlug,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  copyState: "idle" | "copied";
  onCopyLink: () => void;
  onVisitStore: () => void;
  publicSlug?: string | undefined;
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}) {
  const publicUrl = publicSlug
    ? `${publicSlug}.lojaveiculos.com.br`
    : "Loja sem link público";

  return (
    <div className="dashboard-toolbar-premium">
      <DashboardHomeEntry delay={0.02}>
        <div className="dashboard-brand-section">
          <h1 className="dashboard-title-h1">Dashboard Gerencial</h1>
          <div className="dashboard-status-pill">
            <span className="dashboard-pulse-dot">
              <span className="ping"></span>
              <span className="dot"></span>
            </span>
            <span className="dashboard-status-pill-text">Loja Ativa</span>
          </div>
        </div>
      </DashboardHomeEntry>

      <div className="dashboard-controls-section">
        <DashboardHomeEntry delay={0.04}>
          <div className="control-group-wrapper">
            <span className="control-group-label">Período</span>
            <div className="datepicker-range-picker">
              <DatePickerField
                label="De"
                maxDate={endDate}
                onChange={onStartDateChange}
                value={startDate}
              />

              <span className="datepicker-separator-text">até</span>

              <DatePickerField
                align="right"
                label="Até"
                minDate={startDate}
                onChange={onEndDateChange}
                value={endDate}
              />
            </div>
          </div>
        </DashboardHomeEntry>

        <DashboardHomeEntry delay={0.06}>
          <div className="control-group-wrapper">
            <span className="control-group-label">Link Público</span>
            <div className="public-link-container">
              <span
                className="public-link-url hover:text-accent transition-colors cursor-pointer"
                onClick={onVisitStore}
                title={publicUrl}
              >
                {publicUrl}
              </span>
              <div className="public-link-actions">
                <button
                  onClick={onCopyLink}
                  className={
                    "compact-action-btn " +
                    (copyState === "copied" ? "compact-action-btn-copied" : "")
                  }
                  disabled={!publicSlug}
                  title="Copiar Link"
                >
                  {copyState === "copied" ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
                <button
                  onClick={onVisitStore}
                  className="compact-action-btn"
                  disabled={!publicSlug}
                  title="Visitar Loja"
                >
                  <Eye className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </DashboardHomeEntry>
      </div>
    </div>
  );
}
