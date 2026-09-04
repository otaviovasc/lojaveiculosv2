import {
  crmChannelRoutingPolicies,
  crmChannelConnections,
} from "@lojaveiculosv2/db";
import { and, eq, isNull } from "drizzle-orm";
import type { CrmRoutingConnectionRepository } from "../../../domains/crm/ports/crmRoutingConnectionRepository.js";
import type {
  CrmChannelRoutingPolicy,
  CrmRoutingPolicyRepository,
} from "../../../domains/crm/ports/crmRoutingPolicyRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmRoutingConnectionRepository(
  db: DrizzleCrmClient,
): CrmRoutingConnectionRepository {
  return {
    async listConnections(input) {
      const rows = await db
        .select()
        .from(crmChannelConnections)
        .where(
          and(
            eq(crmChannelConnections.storeId, input.storeId),
            eq(crmChannelConnections.tenantId, input.tenantId),
          ),
        );
      return rows.map((row) => {
        const metadata = readRoutingRecord(row.metadata);
        const capabilities = readRoutingRecord(metadata.capabilities);
        return {
          capabilities: {
            conversation_start: capabilities.conversation_start === true,
            inbound: capabilities.inbound === true,
            media: capabilities.media === true,
            outbound: capabilities.outbound === true,
            scheduling: capabilities.scheduling === true,
            templates: capabilities.templates === true,
            text: capabilities.text === true,
          },
          channel: row.channel,
          connected: metadata.connected === true,
          credentialBroker: row.broker,
          degraded: metadata.degraded === true || row.state === "error",
          displayName: row.displayName,
          errorCode: readRoutingString(metadata.errorCode),
          id: row.id,
          provider: row.provider,
          state: row.state,
          storeId: row.storeId as never,
          tenantId: row.tenantId as never,
        };
      });
    },
  };
}

export function createDrizzleCrmRoutingPolicyRepository(
  db: DrizzleCrmClient,
): CrmRoutingPolicyRepository {
  return {
    async createDefaultIfMissing(input) {
      const [row] = await db
        .insert(crmChannelRoutingPolicies)
        .values(input)
        .onConflictDoUpdate({
          set: {
            defaultConnectionId: input.defaultConnectionId,
            updatedAt: new Date(),
          },
          setWhere: isNull(crmChannelRoutingPolicies.defaultConnectionId),
          target: [
            crmChannelRoutingPolicies.tenantId,
            crmChannelRoutingPolicies.storeId,
            crmChannelRoutingPolicies.channel,
          ],
        })
        .returning();
      return row ? mapPolicy(row) : null;
    },
    async listPolicies(input) {
      const rows = await db
        .select({
          externalBotConnectionId:
            crmChannelRoutingPolicies.externalBotConnectionId,
          externalBotMode: crmChannelRoutingPolicies.externalBotMode,
          channel: crmChannelRoutingPolicies.channel,
          defaultConnectionId: crmChannelRoutingPolicies.defaultConnectionId,
          id: crmChannelRoutingPolicies.id,
          storeId: crmChannelRoutingPolicies.storeId,
          tenantId: crmChannelRoutingPolicies.tenantId,
        })
        .from(crmChannelRoutingPolicies)
        .where(
          and(
            eq(crmChannelRoutingPolicies.storeId, input.storeId),
            eq(crmChannelRoutingPolicies.tenantId, input.tenantId),
          ),
        );
      return rows.map(mapPolicy);
    },
    async upsertPolicy(input) {
      const [row] = await db
        .insert(crmChannelRoutingPolicies)
        .values(input)
        .onConflictDoUpdate({
          set: {
            externalBotConnectionId: input.externalBotConnectionId,
            externalBotMode: input.externalBotMode,
            defaultConnectionId: input.defaultConnectionId,
            updatedAt: new Date(),
          },
          target: [
            crmChannelRoutingPolicies.tenantId,
            crmChannelRoutingPolicies.storeId,
            crmChannelRoutingPolicies.channel,
          ],
        })
        .returning();
      if (!row) throw new Error("CRM routing policy upsert returned no row.");
      return mapPolicy(row);
    },
  };
}

function mapPolicy(row: {
  externalBotConnectionId: string | null;
  externalBotMode: CrmChannelRoutingPolicy["externalBotMode"];
  channel: CrmChannelRoutingPolicy["channel"];
  defaultConnectionId: string | null;
  id: string;
  storeId: string;
  tenantId: string;
}): CrmChannelRoutingPolicy {
  return {
    externalBotConnectionId: row.externalBotConnectionId,
    externalBotMode: row.externalBotMode,
    channel: row.channel,
    defaultConnectionId: row.defaultConnectionId,
    id: row.id,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}

function readRoutingRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readRoutingString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
