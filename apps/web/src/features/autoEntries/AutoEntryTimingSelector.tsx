import { CalendarClock } from "lucide-react";
import { FeatureSegmentedControl } from "../../components/ui/FeatureControls";
import type { AutoEntryTiming } from "./types";

type TimingKind = AutoEntryTiming["kind"];
type ScheduledTimingKind = Exclude<TimingKind, "same_day">;

const timingOptions: ReadonlyArray<{ label: string; value: TimingKind }> = [
  { label: "Mesmo dia", value: "same_day" },
  { label: "Dias depois", value: "days_after" },
  { label: "Dia do mês", value: "day_of_month" },
  { label: "Próx. mês", value: "next_month_day" },
];

const TIMING_LIMITS: Record<ScheduledTimingKind, number> = {
  day_of_month: 31,
  days_after: 365,
  next_month_day: 31,
};

const TIMING_PREFIX: Record<ScheduledTimingKind, string> = {
  day_of_month: "Dia",
  days_after: "Após",
  next_month_day: "Dia",
};

const TIMING_UNIT: Record<ScheduledTimingKind, string> = {
  day_of_month: "de cada mês",
  days_after: "dias",
  next_month_day: "do próximo mês",
};

const TIMING_INPUT_LABEL: Record<ScheduledTimingKind, string> = {
  day_of_month: "Dia do mês",
  days_after: "Quantidade de dias",
  next_month_day: "Dia do próximo mês",
};

const TIMING_PLACEHOLDER: Record<ScheduledTimingKind, string> = {
  day_of_month: "Ex.: 5",
  days_after: "Ex.: 10",
  next_month_day: "Ex.: 5",
};

/**
 * Keeps only digits, drops leading zeros and clamps above the timing limit so
 * the stored value stays a clean integer candidate for form validation.
 */
export function normalizeTimingValue(raw: string, maximum: number) {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  return String(Math.min(Number(digits), maximum));
}

/**
 * Segmented "when does this post" control. Each scheduling mode pairs a
 * compact numeric input with plain-language affixes, mirroring the scheduling
 * affordance that made the V1 screen easy to read. Shared by the custom-rule
 * dialog and every domain card so scheduling looks and behaves identically
 * everywhere.
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
        <TimingValueInput
          disabled={disabled}
          error={error}
          kind={kind}
          onValueChange={onValueChange}
          value={value}
        />
      )}
      {error ? (
        <p className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TimingValueInput({
  disabled,
  error,
  kind,
  onValueChange,
  value,
}: {
  disabled?: boolean | undefined;
  error?: string | undefined;
  kind: ScheduledTimingKind;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="auto-entry-timing__param">
      <span className="auto-entry-timing__unit">{TIMING_PREFIX[kind]}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-label={TIMING_INPUT_LABEL[kind]}
        className="auto-entry-timing__field"
        disabled={disabled}
        inputMode="numeric"
        max={TIMING_LIMITS[kind]}
        min={1}
        onChange={(event) =>
          onValueChange(
            normalizeTimingValue(event.target.value, TIMING_LIMITS[kind]),
          )
        }
        placeholder={TIMING_PLACEHOLDER[kind]}
        type="number"
        value={value}
      />
      <span className="auto-entry-timing__unit">{TIMING_UNIT[kind]}</span>
      <span className="ml-auto text-xs font-semibold text-muted">
        1–{TIMING_LIMITS[kind]}
      </span>
    </div>
  );
}
