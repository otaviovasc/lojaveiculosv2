import { randomUUID } from "node:crypto";
import type {
  CrmSpecialDateConfig,
  CrmSpecialDateRepository,
  MemoryCrmSpecialDateRepositoryOptions,
  ScheduleSpecialDateAtomicInput,
  UpsertCrmSpecialDateConfigInput,
} from "./ports/crmSpecialDateRepository.js";
import {
  cancelSpecialDateExecutions,
  canonicalizeRecipients,
  createSpecialDateState,
} from "./testSupportSpecialDatesState.js";
import { scheduleSpecialDateInMemory } from "./testSupportSpecialDatesScheduling.js";

/**
 * In-memory adapter for domain tests. Production composition supplies the
 * shared conversation repository so schedules are visible to regular CRM
 * scheduler views.
 */
export function createMemoryCrmSpecialDateRepository(
  seed: MemoryCrmSpecialDateRepositoryOptions = {},
): CrmSpecialDateRepository {
  const state = createSpecialDateState(seed);
  const conversationRepository = seed.conversationRepository;
  let lock: Promise<void> = Promise.resolve();
  const serialized = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = lock.then(operation, operation);
    lock = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return {
    async findAnniversaryRecipients(tenantId, storeId) {
      return canonicalizeRecipients(
        state.anniversaries.filter((recipient) =>
          isRecipientInScope(recipient, tenantId, storeId),
        ),
      );
    },
    async findAudienceRecipients(tenantId, storeId) {
      return canonicalizeRecipients(
        state.audience.filter((recipient) =>
          isRecipientInScope(recipient, tenantId, storeId),
        ),
      );
    },
    async findBirthdayRecipients(tenantId, storeId) {
      return canonicalizeRecipients(
        state.birthdays.filter((recipient) =>
          isRecipientInScope(recipient, tenantId, storeId),
        ),
      );
    },
    async listConfigsByConnection(tenantId, storeId, connectionId) {
      return state.configs.filter(
        (config) =>
          config.tenantId === tenantId &&
          config.storeId === storeId &&
          config.connectionId === connectionId,
      );
    },
    async listEnabledConfigs(tenantId, storeId) {
      return state.configs.filter(
        (config) =>
          config.tenantId === tenantId &&
          config.storeId === storeId &&
          config.enabled,
      );
    },
    async listEnabledConfigScopes({ cursor, limit }) {
      const scopes = new Map<
        string,
        {
          storeId: CrmSpecialDateConfig["storeId"];
          tenantId: CrmSpecialDateConfig["tenantId"];
        }
      >();
      for (const config of state.configs) {
        if (!config.enabled) continue;
        scopes.set(`${config.tenantId}:${config.storeId}`, {
          storeId: config.storeId,
          tenantId: config.tenantId,
        });
      }
      const values = [...scopes.values()];
      const offset = cursor ? Number(cursor) : 0;
      const start = Number.isInteger(offset) && offset >= 0 ? offset : 0;
      const page = values.slice(start, start + limit);
      const nextOffset = start + page.length;
      return {
        nextCursor: nextOffset < values.length ? String(nextOffset) : null,
        scopes: page,
      };
    },
    async cancelPendingSpecialDateExecutions(
      tenantId,
      storeId,
      connectionId,
      dateType,
    ) {
      return serialized(() =>
        cancelSpecialDateExecutions(
          state,
          conversationRepository,
          tenantId,
          storeId,
          connectionId,
          dateType,
        ),
      );
    },
    async scheduleSpecialDateAtomic(input: ScheduleSpecialDateAtomicInput) {
      return serialized(() =>
        scheduleSpecialDateInMemory(
          state,
          conversationRepository,
          seed.outboundIntentRepository,
          input,
        ),
      );
    },
    async upsertConfig(input: UpsertCrmSpecialDateConfigInput) {
      return serialized(async () => {
        const index = state.configs.findIndex(
          (config) =>
            config.tenantId === input.tenantId &&
            config.storeId === input.storeId &&
            config.connectionId === input.connectionId &&
            config.dateType === input.dateType,
        );
        const now = new Date();
        if (index >= 0) {
          const current = state.configs[index]!;
          if (
            input.expectedRevision !== undefined &&
            (current.revision ?? 0) !== input.expectedRevision
          ) {
            throw new Error(
              "CRM special date configuration revision conflict.",
            );
          }
          const updated: CrmSpecialDateConfig = {
            ...current,
            enabled: input.enabled,
            leadDays: input.leadDays ?? current.leadDays,
            messageTemplate: input.messageTemplate ?? current.messageTemplate,
            revision: (current.revision ?? 0) + 1,
            sendTime: input.sendTime ?? current.sendTime,
            updatedAt: now,
          };
          state.configs[index] = updated;
          if (!updated.enabled) {
            await cancelSpecialDateExecutions(
              state,
              conversationRepository,
              input.tenantId,
              input.storeId,
              input.connectionId,
              input.dateType,
            );
          }
          return updated;
        }
        if (input.expectedRevision !== undefined) {
          throw new Error("CRM special date configuration revision conflict.");
        }
        const created: CrmSpecialDateConfig = {
          connectionId: input.connectionId,
          createdAt: now,
          dateType: input.dateType,
          enabled: input.enabled,
          id: randomUUID(),
          leadDays: input.leadDays ?? 0,
          messageTemplate: input.messageTemplate ?? "",
          revision: 0,
          sendTime: input.sendTime ?? "09:00",
          storeId: input.storeId,
          tenantId: input.tenantId,
          updatedAt: now,
        };
        state.configs.push(created);
        return created;
      });
    },
  };
}

function isRecipientInScope(
  recipient: { storeId: string; tenantId: string },
  tenantId: string,
  storeId: string,
) {
  return recipient.tenantId === tenantId && recipient.storeId === storeId;
}
