import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  CreateFiscalRecipientInput,
  FiscalServiceRecipient,
  UpdateFiscalRecipientInput,
} from "../../ports/fiscalRepository.js";
import { FiscalRecipientNotFoundError } from "../../domain/fiscalErrors.js";
import {
  normalizeFiscalDocumentNumber,
  stripUndefined,
} from "../../domain/fiscalCatalogSupport.js";
import {
  requireFiscalScope,
  type FiscalServicePorts,
} from "./serviceSupport.js";

export type UpsertFiscalRecipientInput = Omit<
  CreateFiscalRecipientInput,
  "documentNumber" | "storeId" | "tenantId"
> & {
  documentNumber: string;
};

export type UpdateFiscalRecipientCommand =
  OptionalPatch<UpsertFiscalRecipientInput> & {
    id: string;
  };

export async function listFiscalRecipients(
  context: ServiceContext,
  ports: FiscalServicePorts,
): Promise<readonly FiscalServiceRecipient[]> {
  assertPermission(context, "fiscal.manage");
  const scope = requireFiscalScope(context);
  context.logger.info(
    "fiscal.recipient.list.started",
    createServiceLogMetadata(context),
  );
  return ports.fiscalRepository.listRecipients(scope);
}

export async function createFiscalRecipient(
  context: ServiceContext,
  input: UpsertFiscalRecipientInput,
  ports: FiscalServicePorts,
): Promise<FiscalServiceRecipient> {
  assertPermission(context, "fiscal.recipient.manage");
  const scope = requireFiscalScope(context);
  context.logger.info(
    "fiscal.recipient.create.started",
    createServiceLogMetadata(context, { documentType: input.documentType }),
  );
  const recipient = await ports.fiscalRepository.createRecipient({
    ...input,
    documentNumber: normalizeFiscalDocumentNumber(
      input.documentType,
      input.documentNumber,
    ),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await auditRecipient(context, recipient, "fiscal.recipient.create");
  return recipient;
}

export async function updateFiscalRecipient(
  context: ServiceContext,
  input: UpdateFiscalRecipientCommand,
  ports: FiscalServicePorts,
): Promise<FiscalServiceRecipient> {
  assertPermission(context, "fiscal.recipient.manage");
  const scope = requireFiscalScope(context);
  context.logger.info(
    "fiscal.recipient.update.started",
    createServiceLogMetadata(context, { recipientId: input.id }),
  );
  const current = await ports.fiscalRepository.getRecipient({
    id: input.id,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!current) throw new FiscalRecipientNotFoundError(input.id);

  const documentType = input.documentType ?? current.documentType;
  const patch = stripUndefined({
    ...input,
    documentNumber: input.documentNumber
      ? normalizeFiscalDocumentNumber(documentType, input.documentNumber)
      : undefined,
  }) as Partial<UpdateFiscalRecipientInput>;
  const recipient = await ports.fiscalRepository.updateRecipient({
    ...patch,
    id: input.id,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await auditRecipient(context, recipient, "fiscal.recipient.update");
  return recipient;
}

type OptionalPatch<T> = {
  [K in keyof T]?: T[K] | undefined;
};

export async function archiveFiscalRecipient(
  context: ServiceContext,
  input: { id: string },
  ports: FiscalServicePorts,
): Promise<FiscalServiceRecipient> {
  return updateFiscalRecipient(
    context,
    { id: input.id, isActive: false },
    ports,
  );
}

async function auditRecipient(
  context: ServiceContext,
  recipient: FiscalServiceRecipient,
  action: string,
) {
  await context.audit.record({
    action,
    actor: context.actor,
    category: "integration",
    entityId: recipient.id,
    entityType: "fiscal_service_recipient",
    metadata: {
      documentType: recipient.documentType,
      isActive: recipient.isActive,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: recipient.storeId,
    tenantId: recipient.tenantId,
    summary: "Updated fiscal service recipient",
  });
}
