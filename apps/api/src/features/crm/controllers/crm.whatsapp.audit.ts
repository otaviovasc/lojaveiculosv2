import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { WhatsappAuditInput } from "./crm.whatsapp.controller.support.js";

export const whatsappAudit = {
  assignSession: (permission: PermissionKey, sessionId: number, agentId: number | null) => ({
    action: "crm.whatsapp.session.assign",
    category: "data_change",
    entityId: sessionId,
    entityType: "crm_whatsapp_session",
    metadata: { assignedAgentId: agentId },
    permission,
    summary: "Assigned CRM WhatsApp session",
  }),
  bootstrap: (permission: PermissionKey) => ({
    action: "crm.whatsapp.bootstrap",
    category: "data_access",
    permission,
    summary: "Loaded CRM WhatsApp bootstrap data",
  }),
  closeSession: (permission: PermissionKey, sessionId: number, mode: string) => ({
    action: "crm.whatsapp.session.close",
    category: "data_change",
    entityId: sessionId,
    entityType: "crm_whatsapp_session",
    metadata: { mode },
    permission,
    summary: "Closed CRM WhatsApp session",
  }),
  createSession: (
    permission: PermissionKey,
    input: {
      connectionId?: number | undefined;
      message?: string | undefined;
      scheduledAt?: string | undefined;
    },
  ) => ({
    action: "crm.whatsapp.session.create",
    category: "data_change",
    metadata: {
      connectionId: input.connectionId ?? null,
      hasInitialMessage: Boolean(input.message),
      hasScheduledAt: Boolean(input.scheduledAt),
    },
    permission,
    summary: "Created CRM WhatsApp session through repasses ACL",
  }),
  listMessages: (permission: PermissionKey, sessionId: number, query: PageQuery) => ({
    action: "crm.whatsapp.messages.list",
    category: "data_access",
    entityId: sessionId,
    entityType: "crm_whatsapp_session",
    metadata: { limit: query.limit, offset: query.offset },
    permission,
    summary: "Listed CRM WhatsApp messages",
  }),
  listSessions: (
    permission: PermissionKey,
    query: PageQuery & { search?: string | undefined },
  ) => ({
    action: "crm.whatsapp.sessions.list",
    category: "data_access",
    metadata: {
      hasSearch: Boolean(query.search),
      limit: query.limit,
      offset: query.offset,
    },
    permission,
    summary: "Listed CRM WhatsApp sessions",
  }),
  markRead: (permission: PermissionKey, sessionId: number) => ({
    action: "crm.whatsapp.session.mark_read",
    category: "data_change",
    entityId: sessionId,
    entityType: "crm_whatsapp_session",
    permission,
    summary: "Marked CRM WhatsApp session as read",
  }),
  markUnread: (
    permission: PermissionKey,
    sessionId: number,
    input: { lastReadAt?: string | null | undefined },
  ) => ({
    action: "crm.whatsapp.session.mark_unread",
    category: "data_change",
    entityId: sessionId,
    entityType: "crm_whatsapp_session",
    metadata: { hasLastReadAt: Boolean(input.lastReadAt) },
    permission,
    summary: "Marked CRM WhatsApp session as unread",
  }),
  sendText: (permission: PermissionKey, sessionId: number, text: string) => ({
    action: "crm.whatsapp.message.send_text",
    category: "data_change",
    entityId: sessionId,
    entityType: "crm_whatsapp_session",
    metadata: { textLength: text.length },
    permission,
    summary: "Sent CRM WhatsApp text message",
  }),
  toggleIntervention: (permission: PermissionKey, sessionId: number) => ({
    action: "crm.whatsapp.session.toggle_intervention",
    category: "data_change",
    entityId: sessionId,
    entityType: "crm_whatsapp_session",
    permission,
    summary: "Toggled CRM WhatsApp human intervention",
  }),
} satisfies Record<string, (...args: never[]) => WhatsappAuditInput>;

type PageQuery = {
  limit: number;
  offset: number;
};
