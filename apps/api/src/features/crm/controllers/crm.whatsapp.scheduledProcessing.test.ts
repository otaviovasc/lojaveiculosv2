import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createCampaignTestApp,
  seedSession,
} from "./crm.whatsapp.campaigns.testSupport.js";

describe("CRM WhatsApp scheduled-message processing", () => {
  it("claims each due message once across concurrent processor runs", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await seedSession(repository, "5511999999304");
    const scheduled = await repository.createScheduledMessage({
      connectionId: seeded.session.connectionId,
      phone: seeded.session.buyerPhone!,
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      sessionId: seeded.session.id,
      storeId: seeded.session.storeId,
      tenantId: seeded.session.tenantId,
      text: "Mensagem processada uma vez",
    });
    const app = createCampaignTestApp(repository);

    const responses = await Promise.all([processDue(app), processDue(app)]);
    const results = await Promise.all(
      responses.map(async (response) => {
        expect(response.status).toBe(200);
        return (await response.json()) as { processed: number; sent: number };
      }),
    );

    expect(results.reduce((total, result) => total + result.processed, 0)).toBe(
      1,
    );
    expect(results.reduce((total, result) => total + result.sent, 0)).toBe(1);
    const [persisted] = await repository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: scheduled.id,
      storeId: seeded.session.storeId,
      tenantId: seeded.session.tenantId,
    });
    expect(persisted).toMatchObject({ status: "sent" });
  });

  it("lets cancellation win before a due message is claimed", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await seedSession(repository, "5511999999305");
    const scheduled = await repository.createScheduledMessage({
      connectionId: seeded.session.connectionId,
      phone: seeded.session.buyerPhone!,
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      sessionId: seeded.session.id,
      storeId: seeded.session.storeId,
      tenantId: seeded.session.tenantId,
      text: "Mensagem cancelada",
    });
    const findDue = repository.findDueScheduledMessages.bind(repository);
    const dueRead = deferred();
    const releaseClaim = deferred();
    repository.findDueScheduledMessages = vi.fn(async (input) => {
      const messages = await findDue(input);
      dueRead.resolve();
      await releaseClaim.promise;
      return messages;
    });
    const app = createCampaignTestApp(repository);

    const processing = processDue(app);
    await dueRead.promise;
    const cancellation = await app.request(
      `/api/v1/crm/whatsapp/scheduled-messages/${scheduled.id}`,
      { method: "DELETE" },
    );
    releaseClaim.resolve();
    const processed = await processing;

    expect(cancellation.status).toBe(200);
    expect(processed.status).toBe(200);
    expect(await processed.json()).toMatchObject({ processed: 0, sent: 0 });
    const [persisted] = await repository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: scheduled.id,
      storeId: seeded.session.storeId,
      tenantId: seeded.session.tenantId,
    });
    expect(persisted).toMatchObject({ status: "cancelled" });
  });
});

function processDue(app: ReturnType<typeof createCampaignTestApp>) {
  return app.request("/api/v1/crm/whatsapp/scheduled-messages/process-due", {
    body: JSON.stringify({ dueAt: "2030-01-01T10:01:00.000Z" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
