import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";

export function SelectFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-wider text-muted">
        {label}
      </span>
      <FeatureSelect options={options} value={value} onChange={onChange} />
    </label>
  );
}

export function DateFilter({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-wider text-muted">
        {label}
      </span>
      <FeatureInput
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
