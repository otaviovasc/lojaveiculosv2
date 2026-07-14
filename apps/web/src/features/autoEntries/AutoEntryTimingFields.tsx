import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import { autoEntryTimingOptions } from "./model";
import type { AutoEntryTiming } from "./types";

export type AutoEntryTimingDraft = {
  kind: AutoEntryTiming["kind"];
  value: string;
};

export function AutoEntryTimingFields({
  draft,
  onChange,
}: {
  draft: AutoEntryTimingDraft;
  onChange: (draft: AutoEntryTimingDraft) => void;
}) {
  const maximum = draft.kind === "days_after" ? 365 : 31;
  return (
    <FeatureFieldGroup>
      <FeatureField label="Momento do lançamento">
        <FeatureSelect
          ariaLabel="Momento do lançamento"
          onChange={(kind) => onChange({ kind, value: "" })}
          options={autoEntryTimingOptions}
          value={draft.kind}
        />
      </FeatureField>
      {draft.kind === "same_day" ? (
        <div className="flex items-center rounded-lg border border-line/60 bg-app-elevated px-3 text-sm font-bold text-muted">
          Criado na data segura informada pelo evento.
        </div>
      ) : (
        <FeatureField
          hint={`Use um inteiro entre 1 e ${maximum}.`}
          label={draft.kind === "days_after" ? "Quantidade" : "Dia"}
        >
          <FeatureInput
            inputMode="numeric"
            max={maximum}
            min={1}
            onChange={(event) =>
              onChange({ ...draft, value: event.target.value })
            }
            type="number"
            value={draft.value}
          />
        </FeatureField>
      )}
    </FeatureFieldGroup>
  );
}

export function buildTiming(draft: AutoEntryTimingDraft) {
  if (draft.kind === "same_day") return { kind: "same_day" } as const;
  const value = Number(draft.value);
  const maximum = draft.kind === "days_after" ? 365 : 31;
  if (!Number.isInteger(value) || value < 1 || value > maximum) return null;
  if (draft.kind === "days_after") {
    return { days: value, kind: "days_after" } as const;
  }
  return { day: value, kind: draft.kind } as AutoEntryTiming;
}
