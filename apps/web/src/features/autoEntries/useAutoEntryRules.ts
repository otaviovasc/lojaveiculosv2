import { useCallback, useEffect, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { AutoEntryRulesApi } from "./apiClient";
import type {
  AutoEntryRule,
  AutoEntryRuleInput,
  AutoEntryRuleMutation,
  AutoEntryRuleStatus,
} from "./types";

export type AutoEntryLoadState =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };

export type AutoEntryFeedback = {
  message: string;
  tone: "danger" | "success";
};

export function useAutoEntryRules(api: AutoEntryRulesApi) {
  const [rules, setRules] = useState<AutoEntryRule[]>([]);
  const [loadState, setLoadState] = useState<AutoEntryLoadState>({
    kind: "loading",
  });
  const [feedback, setFeedback] = useState<AutoEntryFeedback | null>(null);
  const [workingKey, setWorkingKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadState({ kind: "loading" });
    setFeedback(null);
    try {
      setRules(await api.listRules());
      setLoadState({ kind: "ready" });
    } catch (error) {
      setLoadState({
        kind: "error",
        message: errorMessage(error, "Não foi possível carregar as regras."),
      });
    }
  }, [api]);

  useEffect(() => {
    let active = true;
    setLoadState({ kind: "loading" });
    void api
      .listRules()
      .then((loadedRules) => {
        if (!active) return;
        setRules(loadedRules);
        setLoadState({ kind: "ready" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadState({
          kind: "error",
          message: errorMessage(error, "Não foi possível carregar as regras."),
        });
      });
    return () => {
      active = false;
    };
  }, [api]);

  const saveRule = async (ruleId: string | null, input: AutoEntryRuleInput) => {
    const key = ruleId ?? "create";
    setWorkingKey(key);
    setFeedback(null);
    try {
      const saved = ruleId
        ? await api.updateRule(ruleId, input)
        : await api.createRule(input);
      setRules((current) => upsertRule(current, saved));
      setFeedback({
        message: ruleId ? "Regra atualizada." : "Regra criada.",
        tone: "success",
      });
      return saved;
    } catch (error) {
      setFeedback({
        message: errorMessage(error, "Não foi possível salvar a regra."),
        tone: "danger",
      });
      throw error;
    } finally {
      setWorkingKey(null);
    }
  };

  const saveRules = async (mutations: readonly AutoEntryRuleMutation[]) => {
    setWorkingKey("domain");
    setFeedback(null);
    try {
      const savedRules: AutoEntryRule[] = [];
      for (const mutation of mutations) {
        const saved = mutation.ruleId
          ? await api.updateRule(mutation.ruleId, mutation.input)
          : await api.createRule(mutation.input);
        savedRules.push(saved);
        setRules((current) => upsertRule(current, saved));
      }
      setFeedback({
        message:
          savedRules.length === 1
            ? "Configuração salva."
            : `${savedRules.length} regras salvas.`,
        tone: "success",
      });
      return savedRules;
    } catch (error) {
      setFeedback({
        message: errorMessage(
          error,
          "Parte da configuração pode ter sido salva. Atualize antes de tentar novamente.",
        ),
        tone: "danger",
      });
      throw error;
    } finally {
      setWorkingKey(null);
    }
  };

  const toggleRule = async (
    rule: AutoEntryRule,
    status: AutoEntryRuleStatus,
  ) => {
    setWorkingKey(rule.id);
    setFeedback(null);
    try {
      const saved = await api.updateRule(rule.id, ruleInput(rule, status));
      setRules((current) => upsertRule(current, saved));
      setFeedback({
        message: status === "active" ? "Regra ativada." : "Regra pausada.",
        tone: "success",
      });
    } catch (error) {
      setFeedback({
        message: errorMessage(error, "Não foi possível alterar a regra."),
        tone: "danger",
      });
    } finally {
      setWorkingKey(null);
    }
  };

  const deleteRule = async (rule: AutoEntryRule) => {
    setWorkingKey(rule.id);
    setFeedback(null);
    try {
      await api.deleteRule(rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
      setFeedback({ message: "Regra excluída.", tone: "success" });
    } catch (error) {
      setFeedback({
        message: errorMessage(error, "Não foi possível excluir a regra."),
        tone: "danger",
      });
      throw error;
    } finally {
      setWorkingKey(null);
    }
  };

  return {
    deleteRule,
    feedback,
    loadState,
    refresh,
    rules,
    saveRule,
    saveRules,
    toggleRule,
    workingKey,
  };
}

function upsertRule(rules: AutoEntryRule[], saved: AutoEntryRule) {
  const exists = rules.some((rule) => rule.id === saved.id);
  return exists
    ? rules.map((rule) => (rule.id === saved.id ? saved : rule))
    : [saved, ...rules];
}

function ruleInput(
  rule: AutoEntryRule,
  status: AutoEntryRuleStatus,
): AutoEntryRuleInput {
  return {
    calculation: rule.calculation,
    category: rule.category,
    conditions: rule.conditions ?? {},
    event: rule.event,
    family: rule.family ?? null,
    metadata: rule.metadata,
    name: rule.name,
    outputType: rule.outputType,
    priority: rule.priority,
    recipient: rule.recipient ?? { kind: "event_seller" },
    resolution: rule.resolution ?? "additive",
    ruleKey: rule.ruleKey ?? null,
    sellerUserId: rule.sellerUserId,
    status,
    timing: rule.timing,
  };
}

function errorMessage(error: unknown, fallback: string) {
  return formatApiErrorDisplay(error, fallback);
}
