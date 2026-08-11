import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmWhatsappRepository } from "./drizzleCrmWhatsappRepository.js";

loadLocalEnv();

const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM WhatsApp Postgres consistency", () => {
  it("keeps duplicate state and reconciles a known sender over an earlier echo", async () => {
    expect(
      process.env.DATABASE_URL,
      "DATABASE_URL is required for raw CRM database validation",
    ).toBeTruthy();

    const sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
    const rollback = new Error("rollback CRM consistency validation");
    const db = drizzle(sqlClient, { schema });

    try {
      await db.transaction(async (transaction) => {
        const [scope] = await transaction
          .select({
            connectionId: schema.crmConnections.id,
            storeId: schema.crmConnections.storeId,
            tenantId: schema.crmConnections.tenantId,
          })
          .from(schema.crmConnections)
          .limit(1);

        expect(
          scope,
          "Seed one local CRM connection before running raw CRM database tests",
        ).toBeTruthy();
        if (!scope) throw new Error("Local CRM connection is missing.");

        const repository = createDrizzleCrmWhatsappRepository(transaction, {
          disableTransactions: true,
        });
        const repositoryScope = {
          connectionId: scope.connectionId,
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        };
        const buyerPhone = `55000${Date.now().toString().slice(-8)}`;
        const providerTimestamp = new Date("2026-08-10T15:00:00.000Z");
        const echo = {
          buyerPhone,
          channel: "WHATSAPP" as const,
          connectionId: repositoryScope.connectionId,
          content: "synthetic outbound validation",
          direction: "OUTBOUND" as const,
          externalId: `raw-echo-${randomUUID()}`,
          metadata: { syntheticValidation: true },
          providerTimestamp,
          senderOrigin: "unknown" as const,
          senderType: "SYSTEM" as const,
          status: "SENT" as const,
          storeId: repositoryScope.storeId,
          tenantId: repositoryScope.tenantId,
          type: "TEXT" as const,
        };

        const providerFirst = await repository.ingestMessage(echo);
        const correlated = await repository.ingestMessage({
          ...echo,
          senderOrigin: "human_crm",
          senderType: "HUMAN",
        });
        const providerReplay = await repository.ingestMessage(echo);

        expect(providerFirst).toMatchObject({
          createdMessage: true,
          message: { senderOrigin: "unknown", senderType: "SYSTEM" },
        });
        expect(correlated).toMatchObject({
          createdMessage: false,
          message: { senderOrigin: "human_crm", senderType: "HUMAN" },
        });
        expect(providerReplay.message).toMatchObject({
          senderOrigin: "human_crm",
          senderType: "HUMAN",
        });

        const inboundExternalId = `raw-inbound-${randomUUID()}`;
        const inbound = await repository.ingestMessage({
          ...echo,
          direction: "INBOUND",
          externalId: inboundExternalId,
          senderOrigin: "customer",
          senderType: "CUSTOMER",
          status: "DELIVERED",
        });
        const completed = await repository.updateSession({
          expectedRevision: inbound.session.revision,
          sessionId: inbound.session.id,
          status: "COMPLETED",
          storeId: repositoryScope.storeId,
          tenantId: repositoryScope.tenantId,
        });
        expect(completed).toBeTruthy();
        if (!completed) throw new Error("Synthetic session was not completed.");

        const duplicate = await repository.ingestMessage({
          ...echo,
          direction: "INBOUND",
          externalId: inboundExternalId,
          senderOrigin: "customer",
          senderType: "CUSTOMER",
          status: "DELIVERED",
        });
        const staleUpdate = await repository.updateSession({
          expectedRevision: completed.revision - 1,
          sessionId: completed.id,
          status: "ACTIVE",
          storeId: repositoryScope.storeId,
          tenantId: repositoryScope.tenantId,
        });

        expect(duplicate).toMatchObject({
          createdMessage: false,
          session: {
            messageCount: completed.messageCount,
            revision: completed.revision,
            status: "COMPLETED",
          },
        });
        expect(staleUpdate).toBeNull();

        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      await sqlClient.end();
    }
  });
});
