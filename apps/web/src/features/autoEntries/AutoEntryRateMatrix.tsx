import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { financingRanks, type FinancingRank } from "./domainModel";

export type AutoEntryRankValues = Record<FinancingRank, string>;

export function emptyRankValues(): AutoEntryRankValues {
  return { R1: "", R2: "", R3: "", R4: "", R5: "" };
}

export function AutoEntryRateMatrix({
  label,
  onChange,
  suggestions,
  values,
}: {
  label: string;
  onChange: (values: AutoEntryRankValues) => void;
  suggestions: AutoEntryRankValues;
  values: AutoEntryRankValues;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-black text-app-text">{label}</legend>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {financingRanks.map((rank) => (
          <FeatureField
            hint={values[rank] ? "Valor ativo retornado" : "Sugestão V1"}
            key={rank}
            label={rank}
          >
            <FeatureInput
              aria-label={`${label} ${rank} (%)`}
              inputMode="decimal"
              onChange={(event) =>
                onChange({ ...values, [rank]: event.target.value })
              }
              placeholder={`${suggestions[rank]}%`}
              value={values[rank]}
            />
          </FeatureField>
        ))}
      </div>
    </fieldset>
  );
}
