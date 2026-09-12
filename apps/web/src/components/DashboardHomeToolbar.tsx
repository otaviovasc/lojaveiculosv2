import { Check, Copy, Eye } from "lucide-react";
import { DashboardHomeEntry } from "./DashboardHomeEntry";
import { Button } from "./ui/button";
import { DatePickerField } from "./ui/DatePickerField";

export function DashboardHomeToolbar({
  canViewAnalytics,
  copyState,
  isPeriodDirty,
  isRefreshing,
  onApplyPeriod,
  onCopyLink,
  publicSlug,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  canViewAnalytics: boolean;
  copyState: "idle" | "copied";
  isPeriodDirty: boolean;
  isRefreshing: boolean;
  onApplyPeriod: () => void;
  onCopyLink: () => void;
  publicSlug?: string | undefined;
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}) {
  const publicUrl = publicSlug
    ? `${publicSlug}.lojaveiculos.com.br`
    : "Loja sem link público";
  const publicHref = publicSlug ? `https://${publicUrl}` : undefined;

  return (
    <div className="dashboard-toolbar-premium">
      <DashboardHomeEntry delay={0.02}>
        <div className="dashboard-brand-section">
          <h1 className="dashboard-title-h1">Dashboard gerencial</h1>
        </div>
      </DashboardHomeEntry>

      <div className="dashboard-controls-section">
        <DashboardHomeEntry delay={0.04}>
          <div className="control-group-wrapper">
            <span className="control-group-label">Período</span>
            <div className="datepicker-range-picker">
              <DatePickerField
                displayValue={canViewAnalytics ? undefined : "—"}
                isDisabled={!canViewAnalytics}
                label="De"
                maxDate={endDate}
                onChange={onStartDateChange}
                value={startDate}
              />

              <span className="datepicker-separator-text">até</span>

              <DatePickerField
                align="right"
                displayValue={canViewAnalytics ? undefined : "—"}
                isDisabled={!canViewAnalytics}
                label="Até"
                minDate={startDate}
                onChange={onEndDateChange}
                value={endDate}
              />
            </div>
            <Button
              aria-busy={isRefreshing}
              disabled={!canViewAnalytics || isRefreshing}
              onClick={onApplyPeriod}
              size="xs"
              type="button"
              variant="outline"
            >
              {isRefreshing
                ? "Atualizando..."
                : isPeriodDirty
                  ? "Aplicar período"
                  : "Atualizar"}
            </Button>
          </div>
        </DashboardHomeEntry>

        <DashboardHomeEntry delay={0.06}>
          <div className="control-group-wrapper">
            <span className="control-group-label">Link público</span>
            <div className="public-link-container">
              {publicHref ? (
                <a
                  className="public-link-url transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={publicHref}
                  rel="noopener noreferrer"
                  target="_blank"
                  title={publicUrl}
                >
                  {publicUrl}
                </a>
              ) : (
                <span className="public-link-url" title={publicUrl}>
                  {publicUrl}
                </span>
              )}
              <div className="public-link-actions">
                <button
                  aria-label={
                    copyState === "copied"
                      ? "Link da loja copiado"
                      : "Copiar link da loja"
                  }
                  onClick={onCopyLink}
                  className={
                    "compact-action-btn " +
                    (copyState === "copied" ? "compact-action-btn-copied" : "")
                  }
                  disabled={!publicSlug}
                  title="Copiar Link"
                  type="button"
                >
                  {copyState === "copied" ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
                {publicHref ? (
                  <a
                    aria-label="Visitar loja pública em nova aba"
                    className="compact-action-btn"
                    href={publicHref}
                    rel="noopener noreferrer"
                    target="_blank"
                    title="Visitar loja"
                  >
                    <Eye className="size-4" />
                  </a>
                ) : (
                  <button
                    aria-label="Loja sem link público"
                    className="compact-action-btn"
                    disabled
                    title="Loja sem link público"
                    type="button"
                  >
                    <Eye className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </DashboardHomeEntry>
      </div>
    </div>
  );
}
