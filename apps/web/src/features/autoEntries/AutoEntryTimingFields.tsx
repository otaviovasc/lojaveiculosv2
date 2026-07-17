import { AutoEntryTimingSelector } from "./AutoEntryTimingSelector";
import type { AutoEntryTiming } from "./types";

export type AutoEntryTimingDraft = {
  kind: AutoEntryTiming["kind"];
  value: string;
};

export function AutoEntryTimingFields({
  disabled,
  draft,
  onChange,
}: {
  disabled?: boolean | undefined;
  draft: AutoEntryTimingDraft;
  onChange: (draft: AutoEntryTimingDraft) => void;
}) {
  return (
    <AutoEntryTimingSelector
      disabled={disabled}
      kind={draft.kind}
      onKindChange={(kind) => onChange({ kind, value: "" })}
      onValueChange={(value) => onChange({ ...draft, value })}
      value={draft.value}
    />
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
