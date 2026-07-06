import type { PermissionKey } from "@lojaveiculosv2/shared";

export const crmWhatsappAdminPermissions = [
  "crm.whatsapp.assign",
  "crm.whatsapp.close",
  "crm.whatsapp.connection.update_credentials",
  "crm.whatsapp.connection.update_metadata",
  "crm.whatsapp.connection.update_status",
  "crm.whatsapp.connection.update_webhooks",
  "crm.whatsapp.list",
  "crm.whatsapp.read",
  "crm.whatsapp.schedule.cancel",
  "crm.whatsapp.schedule.create",
  "crm.whatsapp.schedule.process",
  "crm.whatsapp.schedule.read",
  "crm.whatsapp.send",
  "crm.whatsapp.tag.assign",
  "crm.whatsapp.tag.manage",
  "crm.whatsapp.toggle_intervention",
] satisfies PermissionKey[];

export const crmWhatsappReadPermissions = [
  "crm.whatsapp.list",
  "crm.whatsapp.read",
] satisfies PermissionKey[];

export const crmWhatsappSalesPermissions = [
  "crm.whatsapp.assign",
  "crm.whatsapp.close",
  "crm.whatsapp.list",
  "crm.whatsapp.read",
  "crm.whatsapp.schedule.cancel",
  "crm.whatsapp.schedule.create",
  "crm.whatsapp.schedule.read",
  "crm.whatsapp.send",
  "crm.whatsapp.tag.assign",
  "crm.whatsapp.toggle_intervention",
] satisfies PermissionKey[];
