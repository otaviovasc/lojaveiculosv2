import { FeatureInput } from "../../components/ui/FeatureControls";
import { financingRanks, type FinancingRank } from "./domainModel";

export type AutoEntryRankValues = Record<FinancingRank, string>;

export function emptyRankValues(): AutoEntryRankValues {
  return { R1: "", R2: "", R3: "", R4: "", R5: "" };
}

/**
 * R1–R5 rate matrix as a compact table: ranks are column headers with a
 * single input row, so it stays one row even on narrow screens (horizontal
 * scroll instead of stacked fields). Fields holding a stored value are tinted
 * with the domain tone and carry an "Ativa" hint; suggestion-only fields stay
 * neutral with the suggestion as placeholder.
 */
export function AutoEntryRateMatrix({
  label,
  onChange,
  stored,
  suggestions,
  values,
}: {
  label: string;
  onChange: (values: AutoEntryRankValues) => void;
  /** Values actually persisted (active rules); drives the tint + hint. */
  stored: AutoEntryRankValues;
  suggestions: AutoEntryRankValues;
  values: AutoEntryRankValues;
}) {
  return (
    <fieldset className="ae-rate-matrix">
      <legend className="text-sm font-black text-app-text">{label}</legend>
      <div className="ae-rate-matrix__scroll mt-3">
        <table className="ae-rate-matrix__table">
          <thead>
            <tr>
              {financingRanks.map((rank) => (
                <th key={rank} scope="col">
                  {rank}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {financingRanks.map((rank) => (
                <td key={rank}>
                  <FeatureInput
                    aria-label={`${label} ${rank} (%)`}
                    className={
                      values[rank] ? "ae-rate-matrix__input--stored" : undefined
                    }
                    inputMode="decimal"
                    onChange={(event) =>
                      onChange({ ...values, [rank]: event.target.value })
                    }
                    placeholder={`${suggestions[rank]}%`}
                    value={values[rank]}
                  />
                  {stored[rank] ? (
                    <span className="ae-rate-matrix__hint">Ativa</span>
                  ) : null}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}
