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
    <div className="flex items-center gap-1.5 bg-app border border-line p-1.5 rounded-xl">
      <Calendar className="text-muted size-3.5 shrink-0 ml-1" />
      <FeatureDateField
        className="min-w-[7rem]"
        label="De"
        max={to}
        onChange={onFromChange}
        value={from}
      />
      <span className="text-muted text-xs font-black uppercase">até</span>
      <FeatureDateField
        className="min-w-[7rem]"
        label="Até"
        min={from}
        onChange={onToChange}
        value={to}
      />
      {(from || to) && (
        <button
          onClick={() => {
            onFromChange("");
            onToChange("");
          }}
          className="p-1 hover:bg-line text-muted hover:text-primary rounded-lg transition-all"
          title="Limpar filtro de data"
          type="button"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
