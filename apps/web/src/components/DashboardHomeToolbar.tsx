import { useState, useRef, useEffect } from "react";
import { CalendarDays, Check, Copy, Eye } from "lucide-react";
import { DashboardHomeEntry } from "./DashboardHomeEntry";
import { Calendar } from "./ui/calendar";

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
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fromRef.current && !fromRef.current.contains(event.target as Node)) {
        setOpenFrom(false);
      }
      if (toRef.current && !toRef.current.contains(event.target as Node)) {
        setOpenTo(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatDate = (date: Date | null) => {
    if (!date) return "DD/MM/AAAA";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
              <div className="relative" ref={fromRef}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenFrom(!openFrom);
                    setOpenTo(false);
                  }}
                  className="datepicker-field-trigger"
                >
                  <CalendarDays className="size-4 text-muted shrink-0" />
                  <span className="datepicker-field-label">De:</span>
                  <span className="font-semibold text-sm">
                    {formatDate(startDate)}
                  </span>
                </button>

                {openFrom && (
                  <div className="datepicker-popover left-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) {
                          onStartDateChange(date);
                          setOpenFrom(false);
                        }
                      }}
                      disabled={(date) => (endDate ? date > endDate : false)}
                      classNames={{
                        weekday:
                          "text-muted-foreground rounded-md w-9 font-black text-xs uppercase tracking-tighter text-center",
                        day_button:
                          "h-9 w-9 p-0 font-normal rounded-md transition-all hover:bg-primary hover:text-white text-xs flex items-center justify-center",
                      }}
                    />
                  </div>
                )}
              </div>

              <span className="datepicker-separator-text">até</span>

              <div className="relative" ref={toRef}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenTo(!openTo);
                    setOpenFrom(false);
                  }}
                  className="datepicker-field-trigger"
                >
                  <CalendarDays className="size-4 text-muted shrink-0" />
                  <span className="datepicker-field-label">Até:</span>
                  <span className="font-semibold text-sm">
                    {formatDate(endDate)}
                  </span>
                </button>

                {openTo && (
                  <div className="datepicker-popover right-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        if (date) {
                          onEndDateChange(date);
                          setOpenTo(false);
                        }
                      }}
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                      classNames={{
                        weekday:
                          "text-muted-foreground rounded-md w-9 font-black text-xs uppercase tracking-tighter text-center",
                        day_button:
                          "h-9 w-9 p-0 font-normal rounded-md transition-all hover:bg-primary hover:text-white text-xs flex items-center justify-center",
                      }}
                    />
                  </div>
                )}
              </div>
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
