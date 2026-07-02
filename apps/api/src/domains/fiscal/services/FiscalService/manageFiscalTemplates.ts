import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  CreateFiscalTemplateInput,
  FiscalServiceInvoiceTemplate,
  UpdateFiscalTemplateInput,
} from "../../ports/fiscalRepository.js";
import {
  FiscalTemplateNotFoundError,
  FiscalValidationError,
} from "../../domain/fiscalErrors.js";
import {
  assertTemplateDescription,
  stripUndefined,
} from "../../domain/fiscalCatalogSupport.js";
import {
  renderFiscalTemplate,
  type RenderFiscalTemplateResult,
} from "../../documents/serviceInvoiceTemplateRenderer.js";
import {
  requireFiscalScope,
  type FiscalServicePorts,
} from "./serviceSupport.js";

export type UpsertFiscalTemplateInput = Omit<
  CreateFiscalTemplateInput,
  "descriptionTemplate" | "storeId" | "tenantId"
> & {
  descriptionTemplate: string;
};

export type UpdateFiscalTemplateCommand =
  OptionalPatch<UpsertFiscalTemplateInput> & {
    id: string;
  };

export async function listFiscalTemplates(
  context: ServiceContext,
  input: { recipientId?: string | null | undefined },
  ports: FiscalServicePorts,
): Promise<readonly FiscalServiceInvoiceTemplate[]> {
  assertPermission(context, "fiscal.manage");
  const scope = requireFiscalScope(context);
  context.logger.info(
    "fiscal.template.list.started",
    createServiceLogMetadata(context, {
      recipientId: input.recipientId ?? null,
    }),
  );
  return ports.fiscalRepository.listTemplates({ ...scope, ...input });
}

export async function createFiscalTemplate(
  context: ServiceContext,
  input: UpsertFiscalTemplateInput,
  ports: FiscalServicePorts,
): Promise<FiscalServiceInvoiceTemplate> {
  assertPermission(context, "fiscal.template.manage");
  const scope = requireFiscalScope(context);
  context.logger.info(
    "fiscal.template.create.started",
    createServiceLogMetadata(context, {
      recipientId: input.recipientId ?? null,
      useCase: input.useCase,
    }),
  );
  await assertRecipientIfPresent(input.recipientId, scope, ports);
  const template = await ports.fiscalRepository.createTemplate({
    ...input,
    descriptionTemplate: assertTemplateDescription(input.descriptionTemplate),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await auditTemplate(context, template, "fiscal.template.create");
  return template;
}

export async function updateFiscalTemplate(
  context: ServiceContext,
  input: UpdateFiscalTemplateCommand,
  ports: FiscalServicePorts,
): Promise<FiscalServiceInvoiceTemplate> {
  assertPermission(context, "fiscal.template.manage");
  const scope = requireFiscalScope(context);
  context.logger.info(
    "fiscal.template.update.started",
    createServiceLogMetadata(context, { templateId: input.id }),
  );
  const current = await ports.fiscalRepository.getTemplate({
    ...scope,
    id: input.id,
  });
  if (!current) throw new FiscalTemplateNotFoundError(input.id);
  await assertRecipientIfPresent(input.recipientId, scope, ports);
  const patch = stripUndefined({
    ...input,
    descriptionTemplate:
      input.descriptionTemplate === undefined
        ? undefined
        : assertTemplateDescription(input.descriptionTemplate),
    version: input.descriptionTemplate ? current.version + 1 : input.version,
  }) as Partial<UpdateFiscalTemplateInput>;
  const template = await ports.fiscalRepository.updateTemplate({
    ...patch,
    id: input.id,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await auditTemplate(context, template, "fiscal.template.update");
  return template;
}

type OptionalPatch<T> = {
  [K in keyof T]?: T[K] | undefined;
};

export async function archiveFiscalTemplate(
  context: ServiceContext,
  input: { id: string },
  ports: FiscalServicePorts,
): Promise<FiscalServiceInvoiceTemplate> {
  return updateFiscalTemplate(
    context,
    { id: input.id, isActive: false },
    ports,
  );
}

export async function previewFiscalTemplate(
  context: ServiceContext,
  input: { templateId: string; variables: Record<string, unknown> },
  ports: FiscalServicePorts,
): Promise<
  RenderFiscalTemplateResult & { templateId: string; version: number }
> {
  assertPermission(context, "fiscal.manage");
  const scope = requireFiscalScope(context);
  context.logger.info(
    "fiscal.template.preview.started",
    createServiceLogMetadata(context, { templateId: input.templateId }),
  );
  const template = await ports.fiscalRepository.getTemplate({
    id: input.templateId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!template) throw new FiscalTemplateNotFoundError(input.templateId);
  return {
    ...renderFiscalTemplate(template.descriptionTemplate, input.variables),
    templateId: template.id,
    version: template.version,
  };
}

export function assertTemplatePreviewResolved(
  preview: RenderFiscalTemplateResult,
) {
  if (preview.unresolvedVariables.length) {
    throw new FiscalValidationError("Template has unresolved variables.", {
      unresolvedVariables: preview.unresolvedVariables,
    });
  }
}

async function assertRecipientIfPresent(
  recipientId: string | null | undefined,
  scope: { storeId: string; tenantId: string },
  ports: FiscalServicePorts,
) {
  if (!recipientId) return;
  const recipient = await ports.fiscalRepository.getRecipient({
    id: recipientId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!recipient) {
    throw new FiscalValidationError("Template recipient does not exist.", {
      field: "recipientId",
    });
  }
}

async function auditTemplate(
  context: ServiceContext,
  template: FiscalServiceInvoiceTemplate,
  action: string,
) {
  await context.audit.record({
    action,
    actor: context.actor,
    category: "integration",
    entityId: template.id,
    entityType: "fiscal_service_invoice_template",
    metadata: {
      recipientId: template.recipientId,
      useCase: template.useCase,
      version: template.version,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: template.storeId,
    tenantId: template.tenantId,
    summary: "Updated fiscal service invoice template",
  });
}
