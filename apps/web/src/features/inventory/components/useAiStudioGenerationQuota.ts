import { useCallback, useEffect, useMemo, useState } from "react";

const monthlyLimit = 30;
const storagePrefix = "lojaveiculosv2:ai-studio-generations";

type StoredAiStudioUsage = {
  periodKey: string;
  used: number;
};

export type AiStudioGenerationQuota = {
  isExhausted: boolean;
  limit: number;
  periodLabel: string;
  recordGeneration: () => void;
  remaining: number;
  used: number;
};

export function useAiStudioGenerationQuota(
  scopeId: string | null | undefined,
): AiStudioGenerationQuota {
  const periodKey = getCurrentPeriodKey();
  const storageKey = `${storagePrefix}:${scopeId || "default"}`;
  const [usage, setUsage] = useState<StoredAiStudioUsage>(() =>
    readUsage(storageKey, periodKey),
  );

  useEffect(() => {
    setUsage(readUsage(storageKey, periodKey));
  }, [periodKey, storageKey]);

  const recordGeneration = useCallback(() => {
    setUsage((current) => {
      const base =
        current.periodKey === periodKey ? current : { periodKey, used: 0 };
      const next = {
        periodKey,
        used: Math.min(monthlyLimit, base.used + 1),
      };
      writeUsage(storageKey, next);
      return next;
    });
  }, [periodKey, storageKey]);

  return useMemo(() => {
    const used = usage.periodKey === periodKey ? usage.used : 0;
    const remaining = Math.max(monthlyLimit - used, 0);

    return {
      isExhausted: remaining <= 0,
      limit: monthlyLimit,
      periodLabel: formatPeriodLabel(periodKey),
      recordGeneration,
      remaining,
      used,
    };
  }, [periodKey, recordGeneration, usage]);
}

function readUsage(storageKey: string, periodKey: string): StoredAiStudioUsage {
  if (typeof window === "undefined") return { periodKey, used: 0 };

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw
      ? (JSON.parse(raw) as Partial<StoredAiStudioUsage>)
      : null;
    if (parsed?.periodKey !== periodKey) return { periodKey, used: 0 };
    return { periodKey, used: clampUsage(parsed.used) };
  } catch {
    return { periodKey, used: 0 };
  }
}

function writeUsage(storageKey: string, usage: StoredAiStudioUsage) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(usage));
  } catch {
    // A failed local write must not block generation.
  }
}

function clampUsage(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), 0), monthlyLimit)
    : 0;
}

function getCurrentPeriodKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function formatPeriodLabel(periodKey: string) {
  const [year, month] = periodKey.split("-");
  return `${month}/${year}`;
}
