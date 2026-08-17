import {
  crmChannelRoutingPolicies,
  providerConnections,
} from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type { CrmRoutingConnectionRepository } from "../../../domains/crm/ports/crmRoutingConnectionRepository.js";
import type { CrmRoutingPolicyRepository } from "../../../domains/crm/ports/crmRoutingPolicyRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  readRoutingRecord,
  readRoutingString,
  synchronizeLegacyConnections,
  verifyLegacyMappings,
} from "./drizzleCrmRoutingSynchronization.js";

export function createDrizzleCrmRoutingConnectionRepository(
  db: DrizzleCrmClient,
): CrmRoutingConnectionRepository {
  return {
    async listConnections(input) {
      const rows = await db
        .select()
        .from(providerConnections)
        .where(
          and(
            eq(providerConnections.storeId, input.storeId),
            eq(providerConnections.tenantId, input.tenantId),
          ),
        );
      return rows.map((row) => {
        const metadata = readRoutingRecord(row.metadata);
        const capabilities = readRoutingRecord(metadata.capabilities);
        return {
          capabilities: {
            inbound: capabilities.inbound === true,
            outbound: capabilities.outbound === true,
            templates: capabilities.templates === true,
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
    synchronizeLegacyConnections: (input) =>
      synchronizeLegacyConnections(db, input),
    verifyLegacyMappings: (input) => verifyLegacyMappings(db, input),
  };
}

export function createDrizzleCrmRoutingPolicyRepository(
  db: DrizzleCrmClient,
): CrmRoutingPolicyRepository {
  return {
    async listPolicies(input) {
      const rows = await db
        .select({
          botConnectionId: crmChannelRoutingPolicies.botConnectionId,
          botMode: crmChannelRoutingPolicies.botMode,
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
      return rows.map((row) => ({
        ...row,
        storeId: row.storeId as never,
        tenantId: row.tenantId as never,
      }));
    },
    async upsertPolicy(input) {
      const [row] = await db
        .insert(crmChannelRoutingPolicies)
        .values(input)
        .onConflictDoUpdate({
          set: {
            botConnectionId: input.botConnectionId,
            botMode: input.botMode,
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
      return {
        botConnectionId: row.botConnectionId,
        botMode: row.botMode,
        channel: row.channel,
        defaultConnectionId: row.defaultConnectionId,
        id: row.id,
        storeId: row.storeId as never,
        tenantId: row.tenantId as never,
      };
    },
  };
}
