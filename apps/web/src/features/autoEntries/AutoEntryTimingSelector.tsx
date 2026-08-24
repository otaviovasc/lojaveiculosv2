import { CalendarClock } from "lucide-react";
import {
  FeatureSegmentedControl,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import type { AutoEntryTiming } from "./types";

type TimingKind = AutoEntryTiming["kind"];

const timingOptions: ReadonlyArray<{ label: string; value: TimingKind }> = [
  { label: "Mesmo dia", value: "same_day" },
  { label: "Dias depois", value: "days_after" },
  { label: "Dia do mês", value: "day_of_month" },
  { label: "Próx. mês", value: "next_month_day" },
];

const monthDayOptions = Array.from({ length: 31 }, (_, index) => {
  const day = String(index + 1);
  return { label: day, value: day };
});

/**
 * Segmented "when does this post" control. Replaces the old dropdown + number
 * field with an at-a-glance choice, mirroring the scheduling affordance that
 * made the V1 screen easy to read. Shared by the custom-rule dialog and every
 * domain card so scheduling looks and behaves identically everywhere.
 */
export function AutoEntryTimingSelector({
  disabled,
  error,
  kind,
  legend = "Momento do lançamento",
  onKindChange,
  onValueChange,
  value,
}: {
  disabled?: boolean | undefined;
  error?: string | undefined;
  kind: TimingKind;
  legend?: string;
  onKindChange: (kind: TimingKind) => void;
  onValueChange: (value: string) => void;
  value: string;
}) {
  const maximum = kind === "days_after" ? 365 : 31;
  const prefix = kind === "days_after" ? "Após" : "Dia";
  const unit =
    kind === "days_after"
      ? "dias"
      : kind === "next_month_day"
        ? "do próximo mês"
        : "de cada mês";
  const isMonthly = kind === "day_of_month" || kind === "next_month_day";

  return (
    <div className="auto-entry-timing">
      <span className="auto-entry-timing__legend">
        <CalendarClock aria-hidden="true" className="size-3.5" />
        {legend}
      </span>
      <FeatureSegmentedControl
        ariaLabel={legend}
        disabled={disabled}
        onChange={onKindChange}
        options={timingOptions}
        value={kind}
      />
      {kind === "same_day" ? (
        <p className="auto-entry-timing__param auto-entry-timing__param--hint">
          Criado na data segura informada pelo evento.
        </p>
      ) : (
        <div className="auto-entry-timing__param">
          <span className="auto-entry-timing__unit">{prefix}</span>
          {isMonthly ? (
            <div className="auto-entry-timing__select">
              <FeatureSelect
                ariaLabel={
                  kind === "next_month_day"
                    ? "Escolher dia do próximo mês"
                    : "Escolher dia do mês"
                }
                disabled={disabled}
                onChange={onValueChange}
                options={monthDayOptions}
                placeholder="Escolha o dia"
                value={value || undefined}
              />
            </div>
          ) : (
            <input
              aria-invalid={Boolean(error)}
              aria-label="Quantidade de dias"
              className="auto-entry-timing__field"
              disabled={disabled}
              inputMode="numeric"
              max={maximum}
              min={1}
              onChange={(event) => onValueChange(event.target.value)}
              type="number"
              value={value}
            />
          )}
          <span className="auto-entry-timing__unit">{unit}</span>
          <span className="ml-auto text-xs font-semibold text-muted">
            1–{maximum}
          </span>
        </div>
      )}
      {error ? (
        <p className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
