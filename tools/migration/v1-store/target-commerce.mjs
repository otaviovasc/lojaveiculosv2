import { cents, legacyMetadata, mapDocumentKind, targetId } from "./common.mjs";
import { addLegacyMap } from "./target-foundation.mjs";
import { log, progress } from "./log.mjs";
import {
  documentKindsForSale,
  mapEntryType,
  mapSalePaymentMethod,
} from "./sale-mapping.mjs";
import {
  buyerSnapshot,
  listingSnapshot,
  salePaymentDetails,
  saleSourceSnapshot,
} from "./sale-snapshots.mjs";

export async function seedSalesAndFinance(tx, data, config, ids) {
  log(`  Sales & finance: ${data.sales.length} sale(s)...`);
  const sources = new Map(
    data.saleSources.map((source) => [source.id, source]),
  );
  const paymentsBySale = Map.groupBy(
    data.salePayments,
    (payment) => payment.saleId,
  );
  const leadsById = new Map(data.leads.map((lead) => [lead.id, lead]));
  const primaryPhotoByVehicle = new Map();
  for (const photo of data.photos) {
    if (!primaryPhotoByVehicle.has(photo.veiculoId)) {
      primaryPhotoByVehicle.set(photo.veiculoId, photo);
    }
  }
  for (const [index, sale] of data.sales.entries()) {
    if (index % 10 === 0 || index === data.sales.length - 1) {
      progress("  Sales", index + 1, data.sales.length);
    }
    const saleId = targetId(config.legacyStoreId, "Sale", sale.id);
    ids.sales.set(sale.id, saleId);
    const vehicle = data.vehicles.find((item) => item.id === sale.veiculoId);
    const status =
      vehicle?.status_anuncio === "VENDIDO"
        ? "closed"
        : config.availableVehicleSalePolicy;
    const payments = paymentsBySale.get(sale.id) || [];
    const source = sources.get(sale.sourceId);
    await tx`INSERT INTO sales
      (id, buyer_snapshot, closed_at, document_policy_snapshot, is_current_revision, lead_id, listing_snapshot, revision, sale_price_cents,
       sale_source_snapshot, selected_document_kinds, seller_user_id, status, store_id, tenant_id, unit_id, created_at, updated_at)
      VALUES (${saleId}, ${tx.json(buyerSnapshot(sale, leadsById.get(sale.leadId)))}, ${sale.saleDate || sale.createdAt}, ${tx.json({ migrated: true })}, true,
        ${ids.leads.get(sale.leadId) || null}, ${tx.json(listingSnapshot(sale, vehicle, primaryPhotoByVehicle.get(sale.veiculoId)))}, 1,
        ${cents(sale.salePrice)}, ${tx.json(saleSourceSnapshot(sale, source, payments))},
        ${tx.json(documentKindsForSale(data.documents, sale.id))}, ${ids.users.get(sale.sellerId) || null}, ${status}, ${ids.store}, ${ids.tenant},
        ${ids.units.get(sale.veiculoId)}, ${sale.createdAt}, ${sale.updatedAt})
      ON CONFLICT (id) DO UPDATE SET buyer_snapshot=excluded.buyer_snapshot, listing_snapshot=excluded.listing_snapshot,
        sale_source_snapshot=excluded.sale_source_snapshot, status=excluded.status, updated_at=excluded.updated_at`;
    await addLegacyMap(tx, ids.run, "Sale", sale.id, "sales", saleId);
    for (const payment of payments) {
      const paymentId = targetId(
        config.legacyStoreId,
        "SalePayment",
        payment.id,
      );
      ids.salePayments.set(payment.id, paymentId);
      const paymentDetails = salePaymentDetails(payment);
      await tx`INSERT INTO sale_payments
        (id, amount_cents, due_at, installments, metadata, method, paid_at, principal_cents, sale_id, status, store_id, tenant_id, created_at, updated_at)
        VALUES (${paymentId}, ${cents(payment.value)}, ${payment.date}, ${paymentDetails.installments}, ${tx.json(paymentDetails.metadata)}, ${mapSalePaymentMethod(payment.method)},
          ${payment.date}, ${cents(payment.value)}, ${saleId}, 'paid', ${ids.store}, ${ids.tenant}, ${payment.date}, ${payment.date})
        ON CONFLICT (id) DO UPDATE SET installments=excluded.installments, metadata=excluded.metadata, method=excluded.method, updated_at=excluded.updated_at`;
      await addLegacyMap(
        tx,
        ids.run,
        "SalePayment",
        payment.id,
        "sale_payments",
        paymentId,
      );
    }
  }

  log(
    `  Sales & finance: ${data.recurringEntries.length} recurring entry(s)...`,
  );
  for (const recurring of data.recurringEntries) {
    await tx`INSERT INTO finance_recurring_entries
      (id, amount_cents, category, day_of_month, frequency, metadata, name, next_due_at, seller_user_id, status, store_id, tenant_id, type, created_at, updated_at)
      VALUES (${targetId(config.legacyStoreId, "RecurringEntry", recurring.id)}, ${cents(recurring.value)}, ${recurring.category || recurring.name || "Legado"},
        ${recurring.dayOfMonth || null}, ${String(recurring.frequency).toLowerCase()}, ${tx.json(legacyMetadata("RecurringEntry", recurring))}, ${recurring.name},
        ${recurring.startDate}, null, ${recurring.isActive ? "pending" : "cancelled"}, ${ids.store}, ${ids.tenant}, ${mapEntryType(recurring.type)},
        ${recurring.createdAt}, ${recurring.updatedAt})
      ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, updated_at=excluded.updated_at`;
  }

  log(`  Sales & finance: ${data.entries.length} finance entry(s)...`);
  for (const [index, entry] of data.entries.entries()) {
    if (index % 10 === 0 || index === data.entries.length - 1) {
      progress("  Finance entries", index + 1, data.entries.length);
    }
    const entryId = targetId(config.legacyStoreId, "Entry", entry.id);
    ids.entries.set(entry.id, entryId);
    await tx`INSERT INTO finance_entries
      (id, amount_cents, category, due_at, metadata, name, paid_at, seller_user_id, status, store_id, tenant_id, type, created_at, updated_at)
      VALUES (${entryId}, ${cents(entry.value)}, ${entry.category || entry.name || "Legado"}, ${entry.dueDate}, ${tx.json(legacyMetadata("Entry", entry))},
        ${entry.name}, ${entry.paidAt || null}, ${ids.users.get(entry.sellerId) || null}, ${String(entry.status).toLowerCase()}, ${ids.store}, ${ids.tenant},
        ${mapEntryType(entry.type)}, ${entry.createdAt}, ${entry.updatedAt})
      ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, status=excluded.status, updated_at=excluded.updated_at`;
    await addLegacyMap(
      tx,
      ids.run,
      "Entry",
      entry.id,
      "finance_entries",
      entryId,
    );
    await seedFinanceLinks(tx, entry, entryId, config, ids);
  }
  await seedCommissionRules(tx, data, config, ids);
  log("  Sales & finance done");
}

async function seedFinanceLinks(tx, entry, entryId, config, ids) {
  const targets = [
    ["lead", ids.leads.get(entry.leadId)],
    ["sale", ids.sales.get(entry.saleId)],
    ["vehicle_listing", ids.listings.get(entry.veiculoId)],
    ["vehicle_unit", ids.units.get(entry.veiculoId)],
  ].filter(([, id]) => id);
  for (const [type, id] of targets) {
    await tx`INSERT INTO finance_entry_links (id, entry_id, target_id, target_type, store_id, tenant_id, created_at, updated_at)
      VALUES (${targetId(config.legacyStoreId, `EntryLink:${type}`, entry.id)}, ${entryId}, ${id}, ${type}, ${ids.store}, ${ids.tenant}, ${entry.createdAt}, ${entry.updatedAt})
      ON CONFLICT (id) DO NOTHING`;
  }
}

async function seedCommissionRules(tx, data, config, ids) {
  log("  Sales & finance: commission rules...");
  for (const access of data.accesses) {
    if (!access.commissionType) continue;
    const type =
      access.commissionType === "FIXED"
        ? "fixed_amount"
        : access.commissionType === "PERCENTAGE"
          ? "percentage"
          : "manual";
    await tx`INSERT INTO commission_rules
      (id, category, fixed_amount_cents, metadata, name, percentage_basis_points, seller_user_id, status, store_id, tenant_id, type, created_at, updated_at)
      VALUES (${targetId(config.legacyStoreId, "LojaAccess:commission", access.id)}, 'vehicle_sale', ${type === "fixed_amount" ? cents(access.commissionValue) : null},
        ${tx.json(legacyMetadata("LojaAccess.commission", access))}, 'Comissão migrada', ${type === "percentage" ? Math.round(Number(access.commissionPercent || 0) * 100) : null},
        ${ids.users.get(access.clerkUserId)}, 'active', ${ids.store}, ${ids.tenant}, ${type}, ${access.createdAt}, ${access.updatedAt})
      ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, updated_at=excluded.updated_at`;
  }
}

export async function seedDocumentsAndFiscal(tx, data, config, ids) {
  log(
    `  Documents & fiscal: ${data.recipients.length} recipient(s), ${data.fiscalDocuments.length} fiscal doc(s), ${data.documents.length} doc(s)...`,
  );
  for (const recipient of data.recipients) {
    const recipientId = targetId(
      config.legacyStoreId,
      "ServiceRecipient",
      recipient.id,
    );
    ids.recipients.set(recipient.id, recipientId);
    const documentNumber = String(recipient.cpfCnpj || "").replace(/\D/g, "");
    if (!documentNumber)
      throw new Error(
        `ServiceRecipient ${recipient.id} has no document number.`,
      );
    const address = {
      address: recipient.address,
      street: recipient.street,
      number: recipient.number,
      district: recipient.district,
      city: recipient.city,
      state: recipient.state,
      postalCode: recipient.postalCode,
      cityCode: recipient.cityCode,
      legacyV1: {
        sourceTable: "ServiceRecipient",
        sourceId: String(recipient.id),
      },
    };
    await tx`INSERT INTO fiscal_service_recipients
      (id, address, document_number, document_type, email, legal_name, municipal_registration, notes, phone, store_id, tenant_id, created_at, updated_at)
      VALUES (${recipientId}, ${tx.json(address)}, ${documentNumber}, ${documentNumber.length > 11 ? "cnpj" : "cpf"}, ${recipient.email || null},
        ${recipient.name}, ${recipient.municipalRegistration || null}, ${recipient.notes || null}, ${recipient.phone || null}, ${ids.store}, ${ids.tenant}, ${recipient.createdAt}, ${recipient.updatedAt})
      ON CONFLICT (id) DO UPDATE SET address=excluded.address, notes=excluded.notes, updated_at=excluded.updated_at`;
  }
  log(
    `  Documents & fiscal: ${data.fiscalDocuments.length} fiscal document(s)...`,
  );
  for (const [index, fiscal] of data.fiscalDocuments.entries()) {
    if (index % 10 === 0 || index === data.fiscalDocuments.length - 1) {
      progress("  Fiscal documents", index + 1, data.fiscalDocuments.length);
    }
    const fiscalId = targetId(
      config.legacyStoreId,
      "FiscalDocument",
      fiscal.id,
    );
    ids.fiscal.set(fiscal.id, fiscalId);
    await tx`INSERT INTO fiscal_documents
      (id, access_key, document_kind, document_type, issued_at, metadata, provider, provider_document_id, recipient_id, status, store_id, tenant_id, created_at, updated_at)
      VALUES (${fiscalId}, ${fiscal.accessKey || null}, ${String(fiscal.docType).toLowerCase()}, ${String(fiscal.docType).toLowerCase()}, ${fiscal.issuedAt || null},
        ${tx.json(legacyMetadata("FiscalDocument", fiscal))}, 'spedy', ${fiscal.invoiceId || null}, ${ids.recipients.get(fiscal.serviceRecipientId) || null},
        ${String(fiscal.status).toLowerCase()}, ${ids.store}, ${ids.tenant}, ${fiscal.createdAt}, ${fiscal.updatedAt})
      ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, status=excluded.status, updated_at=excluded.updated_at`;
    await seedFiscalLinks(tx, fiscal, fiscalId, config, ids);
  }
  const testDrives = new Map(data.testDrives.map((row) => [row.id, row]));
  log(`  Documents & fiscal: ${data.documents.length} document(s)...`);
  for (const [index, document] of data.documents.entries()) {
    if (index % 50 === 0 || index === data.documents.length - 1) {
      progress("  Documents", index + 1, data.documents.length);
    }
    await seedDocument(
      tx,
      {
        ...document,
        legacyTestDrive: testDrives.get(document.legacyTestDriveId) || null,
      },
      config,
      ids,
    );
  }
  log("  Documents & fiscal done");
}

async function seedDocument(tx, document, config, ids) {
  const documentId = targetId(config.legacyStoreId, "Document", document.id);
  const available = Boolean(document.pdfR2Key && document.pdfUrl);
  const storageKey = available
    ? document.pdfR2Key
    : `legacy-unavailable/v1/Document/${document.id}`;
  const metadata = legacyMetadata("Document", document, {
    artifactAvailable: available,
    legacyPublicUrl: document.pdfUrl || null,
  });
  await tx`INSERT INTO documents
    (id, created_by_user_id, file_name, kind, metadata, mime_type, status, storage_key, store_id, tenant_id, title, uploaded_at, created_at, updated_at)
    VALUES (${documentId}, ${ids.users.get(document.sellerId) || null}, ${`${document.title || document.type}-${document.id}.pdf`}, ${mapDocumentKind(document.type)},
      ${tx.json(metadata)}, 'application/pdf', ${available ? "issued" : "archived"}, ${storageKey}, ${ids.store}, ${ids.tenant}, ${document.title || document.type},
      ${document.occurredAt || document.createdAt}, ${document.createdAt}, ${document.updatedAt})
    ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, status=excluded.status, updated_at=excluded.updated_at`;
  const targets = [
    ["vehicle_unit", ids.units.get(document.veiculoId)],
    ["lead", ids.leads.get(document.leadId)],
    ["sale", ids.sales.get(document.saleId)],
  ].filter(([, id]) => id);
  if (!targets.length) targets.push(["store", ids.store]);
  for (const [type, id] of targets)
    await tx`INSERT INTO document_links
    (id, document_id, link_role, store_id, target_id, target_type, tenant_id, created_at, updated_at)
    VALUES (${targetId(config.legacyStoreId, `DocumentLink:${type}`, document.id)}, ${documentId}, 'primary', ${ids.store}, ${id}, ${type}, ${ids.tenant}, ${document.createdAt}, ${document.updatedAt})
    ON CONFLICT (id) DO NOTHING`;
  await addLegacyMap(
    tx,
    ids.run,
    "Document",
    document.id,
    "documents",
    documentId,
  );
}

async function seedFiscalLinks(tx, fiscal, fiscalId, config, ids) {
  const targets = [
    ["sale", ids.sales.get(fiscal.saleId)],
    ["lead", ids.leads.get(fiscal.leadId)],
    ["finance_entry", ids.entries.get(fiscal.entryId)],
  ].filter(([, id]) => id);
  for (const [type, id] of targets)
    await tx`INSERT INTO fiscal_document_links
    (id, fiscal_document_id, store_id, target_id, target_type, tenant_id, created_at, updated_at)
    VALUES (${targetId(config.legacyStoreId, `FiscalLink:${type}`, fiscal.id)}, ${fiscalId}, ${ids.store}, ${id}, ${type}, ${ids.tenant}, ${fiscal.createdAt}, ${fiscal.updatedAt})
    ON CONFLICT (id) DO NOTHING`;
}
