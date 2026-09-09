import { useCallback, useEffect, useState } from "react";
import { createSettingsApi } from "../settings/apiClient";
import { createSettingsApiOptions } from "../settings/runtimeApi";
import type { StoreMemberOptionView } from "../settings/types";

export type CrmSellerOption = {
  email: string;
  id: string;
  name: string;
  role: string;
};

export type UseCrmSellerOptionsResult = {
  error: Error | null;
  isLoading: boolean;
  members: CrmSellerOption[];
  retry: () => void;
};

export type StoreMemberOptionsLoader = () => Promise<{
  members: readonly StoreMemberOptionView[];
}>;

export function useCrmSellerOptions(
  enabled = true,
  customLoader?: StoreMemberOptionsLoader,
): UseCrmSellerOptionsResult {
  const [members, setMembers] = useState<CrmSellerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setIsLoading(true);
    setError(null);

    const loadPromise = customLoader
      ? customLoader()
      : createSettingsApiOptions().then((options) =>
          createSettingsApi(options).getStoreMemberOptions(),
        );

    void loadPromise
      .then((data) => {
        if (!active) return;
        setMembers(
          data.members.map((m) => ({
            email: m.email,
            id: m.userId,
            name: m.name?.trim() || m.email,
            role: m.role,
          })),
        );
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, attempt, customLoader]);

  return { error, isLoading, members, retry };
}
