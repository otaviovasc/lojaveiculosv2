import { randomUUID } from "node:crypto";
import type {
  CrmSpecialDateConfig,
  CrmSpecialDateExecution,
  MemoryCrmSpecialDateRepositoryOptions,
  ScheduleSpecialDateAtomicInput,
  SpecialDateRecipientCandidate,
} from "./ports/crmSpecialDateRepository.js";

export type MemorySpecialDateState = {
  anniversaries: SpecialDateRecipientCandidate[];
  audience: SpecialDateRecipientCandidate[];
  birthdays: SpecialDateRecipientCandidate[];
  configs: CrmSpecialDateConfig[];
  executions: CrmSpecialDateExecution[];
};

export function createSpecialDateState(
  seed: MemoryCrmSpecialDateRepositoryOptions,
): MemorySpecialDateState {
  return {
    anniversaries: [...(seed.anniversaryRecipients ?? [])],
    audience: [...(seed.audienceRecipients ?? [])],
    birthdays: [...(seed.birthdayRecipients ?? [])],
    configs: (seed.configs ?? []).map((config) => ({
      ...config,
      revision: config.revision ?? 0,
    })),
    executions: [],
  };
}

export function findSpecialDateExecution(
  state: MemorySpecialDateState,
  input: {
    connectionId: string;
    dateType: string;
    recipientKey: string;
    storeId: string;
    targetYear: number;
    tenantId: string;
  },
) {
  return state.executions.find(
    (execution) =>
      execution.tenantId === input.tenantId &&
      execution.storeId === input.storeId &&
      execution.connectionId === input.connectionId &&
      execution.dateType === input.dateType &&
      execution.targetYear === input.targetYear &&
      execution.recipientKey === input.recipientKey,
  );
}

export async function cancelSpecialDateExecutions(
  state: MemorySpecialDateState,
  conversationRepository: MemoryCrmSpecialDateRepositoryOptions["conversationRepository"],
  tenantId: string,
  storeId: string,
  connectionId: string,
  dateType: string,
) {
  const targets = state.executions.filter(
    (execution) =>
      execution.tenantId === tenantId &&
      execution.storeId === storeId &&
      execution.connectionId === connectionId &&
      execution.dateType === dateType &&
      execution.status === "scheduled",
  );
  if (conversationRepository) {
    for (const target of targets) {
      if (!target.scheduledMessageId) continue;
      await conversationRepository.updateScheduledMessage({
        expectedStatus: "pending",
        id: target.scheduledMessageId,
        status: "cancelled",
        storeId: storeId as never,
        tenantId: tenantId as never,
      });
    }
  }
  const now = new Date();
  for (const target of targets) {
    target.status = "cancelled";
    target.updatedAt = now;
  }
  return targets.length;
}

export function canonicalRecipientKey(key: string, phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `phone:${digits}` : key.trim();
}

export function canonicalizeRecipients(
  recipients: readonly SpecialDateRecipientCandidate[],
) {
  return recipients.map((recipient) => ({
    ...recipient,
    key: canonicalRecipientKey(recipient.key, recipient.phone),
  }));
}

export function specialDateMetadata(
  input: ScheduleSpecialDateAtomicInput,
  executionId: string,
  recipientKey: string,
) {
  return {
    ...(input.metadata ?? {}),
    specialDate: {
      configId: input.configId,
      configRevision: input.configRevision,
      dateType: input.dateType,
      executionId,
      recipientKey,
      targetYear: input.targetYear,
    },
  };
}

export function newSpecialDateExecution(input: {
  configRevision: number;
  connectionId: string;
  dateType: CrmSpecialDateExecution["dateType"];
  recipientKey: string;
  storeId: CrmSpecialDateExecution["storeId"];
  targetYear: number;
  tenantId: CrmSpecialDateExecution["tenantId"];
}): CrmSpecialDateExecution {
  const now = new Date();
  return {
    configRevision: input.configRevision,
    connectionId: input.connectionId,
    createdAt: now,
    dateType: input.dateType,
    id: randomUUID(),
    recipientKey: input.recipientKey,
    scheduledMessageId: null,
    status: "scheduled",
    storeId: input.storeId,
    targetYear: input.targetYear,
    tenantId: input.tenantId,
    updatedAt: now,
  };
}
