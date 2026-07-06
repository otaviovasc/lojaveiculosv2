import type { PermissionKey } from "@lojaveiculosv2/shared";

export const crmWhatsappAdminPermissions = [
  "crm.whatsapp.assign",
  "crm.whatsapp.close",
  "crm.whatsapp.connection.manage",
  "crm.whatsapp.list",
  "crm.whatsapp.read",
  "crm.whatsapp.campaigns.manage",
  "crm.whatsapp.campaigns.read",
  "crm.whatsapp.integrations.manage",
  "crm.whatsapp.schedules.cancel",
  "crm.whatsapp.schedules.create",
  "crm.whatsapp.schedules.process",
  "crm.whatsapp.schedules.read",
  "crm.whatsapp.send",
  "crm.whatsapp.tags.assign",
  "crm.whatsapp.tags.manage",
  "crm.whatsapp.toggle_intervention",
  "crm.pipeline.manage",
  "crm.pipeline.move",
  "crm.pipeline.read",
  "crm.visits.manage",
  "crm.visits.read",
] satisfies PermissionKey[];

export const crmWhatsappReadPermissions = [
  "crm.whatsapp.list",
  "crm.whatsapp.read",
  "crm.pipeline.read",
  "crm.visits.read",
] satisfies PermissionKey[];

export const crmWhatsappSalesPermissions = [
  "crm.whatsapp.assign",
  "crm.whatsapp.close",
  "crm.whatsapp.list",
  "crm.whatsapp.read",
  "crm.whatsapp.schedules.cancel",
  "crm.whatsapp.schedules.create",
  "crm.whatsapp.schedules.read",
  "crm.whatsapp.send",
  "crm.whatsapp.tags.assign",
  "crm.whatsapp.toggle_intervention",
  "crm.pipeline.move",
  "crm.pipeline.read",
  "crm.visits.manage",
  "crm.visits.read",
] satisfies PermissionKey[];
