import { Calendar, X } from "lucide-react";
import { FeatureDateField } from "../../../components/ui/FeatureControls";

export function AgencyDateFilter({
  from,
  onFromChange,
  onToChange,
  to,
}: {
  from: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  to: string;
}) {
  return (
    <div className="agency-date-filter">
      <Calendar aria-hidden="true" />
      <FeatureDateField
        className="agency-date-filter__field"
        label="De"
        max={to}
        onChange={onFromChange}
        value={from}
      />
      <span className="agency-date-filter__separator">até</span>
      <FeatureDateField
        className="agency-date-filter__field"
        label="Até"
        min={from}
        onChange={onToChange}
        value={to}
      />
      {from || to ? (
        <button
          aria-label="Limpar período"
          onClick={() => {
            onFromChange("");
            onToChange("");
          }}
          className="agency-date-filter__clear"
          title="Limpar filtro de data"
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
