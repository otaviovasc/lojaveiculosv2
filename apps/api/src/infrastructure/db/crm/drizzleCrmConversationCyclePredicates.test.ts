import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { SQL } from "drizzle-orm";
import { CasingCache } from "drizzle-orm/casing";
import { describe, expect, it } from "vitest";
import type { IngestCrmMessageInput } from "../../../domains/crm/ports/crmConversationRepository.js";
import { crmUnreadConversationCyclePredicate as crmConversationUnreadCyclePredicate } from "./drizzleCrmConversationQueries.js";
import { crmNewerConversationMessagePreview as crmConversationNewerMessagePreview } from "./drizzleCrmConversationCyclePreview.js";
import { cleanSessionUpdate } from "./drizzleCrmConversationUpdates.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("Drizzle CRM conversation-cycle predicates", () => {
  it("builds unread filtering as a database predicate before pagination", () => {
    const { sql } = renderDrizzleSql(crmConversationUnreadCyclePredicate());

    expect(sql).toContain("exists");
    expect(sql).toContain("crm_messages.cycle_id");
    expect(sql).toContain("crm_conversation_cycles.id");
    expect(sql).toContain("crm_messages.direction = 'inbound'");
    expect(sql).toContain("crm_messages.created_at > coalesce");
    expect(sql).toContain("crm_conversation_cycles.last_read_at");
  });

  it("builds preview updates that ignore older delayed webhooks", () => {
    const incomingAt = new Date("2026-07-03T12:00:00.000Z");
    const preview = crmConversationNewerMessagePreview({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Mensagem nova",
      direction: "INBOUND",
      externalId: "zapi-message-new",
      metadata: {},
      providerTimestamp: incomingAt,
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    } satisfies IngestCrmMessageInput);

    const lastMessageAt = renderDrizzleSql(preview.lastMessageAt);
    const lastMessageContent = renderDrizzleSql(preview.lastMessageContent);

    expect(lastMessageAt.sql).toContain("case");
    expect(lastMessageAt.sql).toContain(
      "crm_conversation_cycles.last_message_at is null",
    );
    expect(lastMessageAt.sql).toContain(
      "> crm_conversation_cycles.last_message_at",
    );
    expect(lastMessageAt.sql).toContain("::timestamptz");
    expect(lastMessageAt.sql).toContain(
      "else crm_conversation_cycles.last_message_at",
    );
    expect(lastMessageContent.sql).toContain("case");
    expect(lastMessageContent.sql).toContain(
      "else crm_conversation_cycles.last_message_content",
    );
    expect(lastMessageAt.params).toContain(incomingAt.toISOString());
    expect(lastMessageContent.params).toContain("Mensagem nova");
  });

  it("increments every persisted conversation-cycle mutation revision in SQL", () => {
    const update = cleanSessionUpdate({
      cycleId: "conversation-cycle-1",
      status: "ACTIVE",
      storeId,
      tenantId,
    });

    expect(renderDrizzleSql(update.revision).sql).toContain(
      "crm_conversation_cycles.revision + 1",
    );
  });
});

function renderDrizzleSql(fragment: SQL) {
  const config: Parameters<SQL["toQuery"]>[0] = {
    casing: new CasingCache(),
    escapeName: (name: string) => name,
    escapeParam: (index: number) => `$${index + 1}`,
    escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
  };
  return fragment.toQuery(config);
}
