import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { SQL } from "drizzle-orm";
import { CasingCache } from "drizzle-orm/casing";
import { describe, expect, it } from "vitest";
import type { IngestCrmWhatsappMessageInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { crmWhatsappUnreadSessionPredicate } from "./drizzleCrmWhatsappRepository.js";
import { crmWhatsappNewerMessagePreview } from "./drizzleCrmWhatsappSessionPreview.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("Drizzle CRM WhatsApp session predicates", () => {
  it("builds unread filtering as a database predicate before pagination", () => {
    const { sql } = renderDrizzleSql(crmWhatsappUnreadSessionPredicate());

    expect(sql).toContain("exists");
    expect(sql).toContain("crm_whatsapp_messages.session_id");
    expect(sql).toContain("crm_whatsapp_sessions.id");
    expect(sql).toContain("crm_whatsapp_messages.direction = 'INBOUND'");
    expect(sql).toContain("crm_whatsapp_messages.created_at > coalesce");
    expect(sql).toContain("crm_whatsapp_sessions.last_read_at");
  });

  it("builds preview updates that ignore older delayed webhooks", () => {
    const incomingAt = new Date("2026-07-03T12:00:00.000Z");
    const preview = crmWhatsappNewerMessagePreview({
      buyerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Mensagem nova",
      direction: "INBOUND",
      externalId: "zapi-message-new",
      metadata: {},
      providerTimestamp: incomingAt,
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    } satisfies IngestCrmWhatsappMessageInput);

    const lastMessageAt = renderDrizzleSql(preview.lastMessageAt);
    const lastMessageContent = renderDrizzleSql(preview.lastMessageContent);

    expect(lastMessageAt.sql).toContain("case");
    expect(lastMessageAt.sql).toContain(
      "crm_whatsapp_sessions.last_message_at is null",
    );
    expect(lastMessageAt.sql).toContain(
      "> crm_whatsapp_sessions.last_message_at",
    );
    expect(lastMessageAt.sql).toContain("::timestamptz");
    expect(lastMessageAt.sql).toContain(
      "else crm_whatsapp_sessions.last_message_at",
    );
    expect(lastMessageContent.sql).toContain("case");
    expect(lastMessageContent.sql).toContain(
      "else crm_whatsapp_sessions.last_message_content",
    );
    expect(lastMessageAt.params).toContain(incomingAt.toISOString());
    expect(lastMessageContent.params).toContain("Mensagem nova");
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
