import type { PermissionKey } from "@lojaveiculosv2/shared";

export const crmAdminPermissions = [
  "crm.conversations.assign",
  "crm.conversations.manage",
  "crm.conversations.read",
  "crm.conversations.read_unassigned",
  "crm.messages.send",
  "crm.messaging.connection.pair",
  "crm.messaging.connection.setup",
  "crm.routing.default.manage",
  "crm.campaigns.manage",
  "crm.campaigns.read",
  "crm.scheduled_messages.cancel",
  "crm.scheduled_messages.create",
  "crm.scheduled_messages.process",
  "crm.scheduled_messages.read",
  "crm.tags.assign",
  "crm.tags.manage",
  "crm.attendances.manage",
  "crm.bot.read",
  "crm.bot.manage",
  "crm.bot.proposals.decide",
  "crm.pipeline.manage",
  "crm.pipeline.move",
  "crm.pipeline.read",
  "crm.visits.manage",
  "crm.visits.read",
] satisfies PermissionKey[];

export const crmReadPermissions = [
  "crm.conversations.read",
  "crm.bot.read",
  "crm.pipeline.read",
  "crm.visits.read",
] satisfies PermissionKey[];

export const crmSalesPermissions = [
  "crm.conversations.assign",
  "crm.conversations.manage",
  "crm.conversations.read",
  "crm.conversations.read_unassigned",
  "crm.scheduled_messages.cancel",
  "crm.scheduled_messages.create",
  "crm.scheduled_messages.read",
  "crm.messages.send",
  "crm.tags.assign",
  "crm.attendances.manage",
  "crm.bot.read",
  "crm.pipeline.move",
  "crm.pipeline.read",
  "crm.visits.manage",
  "crm.visits.read",
] satisfies PermissionKey[];
