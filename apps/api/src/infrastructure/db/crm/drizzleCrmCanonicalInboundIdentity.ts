import {
  contactIdentities,
  contactIdentityCandidates,
  contacts,
} from "@lojaveiculosv2/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { CanonicalInboundMessageInput } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function lockCanonicalIdentity(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
) {
  const key = [
    "crm-inbound",
    input.tenantId,
    input.storeId,
    input.identity.kind,
    input.identity.normalizedValue,
  ].join(":");
  await db.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`,
  );
}

export async function resolveCanonicalIdentity(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
) {
  const primary = await findVerifiedIdentity(
    db,
    input,
    input.identity.kind,
    input.identity.normalizedValue,
  );
  if (primary) {
    if (!primary.contactId)
      throw new Error("Verified canonical CRM identity has no contact.");
    await observeSecondaryPhone(db, input, primary.contactId);
    return { contactId: primary.contactId, identityId: primary.id };
  }
  const observed = await findObservedIdentity(db, input);
  if (observed) {
    await observeSecondaryPhone(db, input, observed.contactId);
    return { contactId: observed.contactId, identityId: observed.identityId };
  }
  const contactId = await createContact(db, input);
  if (!contactId) throw new Error("Canonical CRM contact was not persisted.");
  const [identity] = await db
    .insert(contactIdentities)
    .values({
      channel: input.channel,
      contactId: null,
      identityKind: input.identity.kind,
      normalizedValue: input.identity.normalizedValue,
      provider: input.provider,
      state: "observed",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning({ id: contactIdentities.id });
  if (!identity) throw new Error("Canonical CRM identity was not persisted.");
  await addCandidate(db, input, identity.id, contactId);
  await observeSecondaryPhone(db, input, contactId);
  return { contactId, identityId: identity.id };
}

async function findObservedIdentity(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
) {
  const [row] = await db
    .select({
      contactId: contactIdentityCandidates.contactId,
      identityId: contactIdentities.id,
    })
    .from(contactIdentities)
    .innerJoin(
      contactIdentityCandidates,
      and(
        eq(contactIdentityCandidates.identityId, contactIdentities.id),
        eq(contactIdentityCandidates.tenantId, input.tenantId),
        eq(contactIdentityCandidates.storeId, input.storeId),
      ),
    )
    .where(
      and(
        eq(contactIdentities.tenantId, input.tenantId),
        eq(contactIdentities.storeId, input.storeId),
        eq(contactIdentities.identityKind, input.identity.kind),
        eq(contactIdentities.normalizedValue, input.identity.normalizedValue),
        eq(contactIdentities.provider, input.provider),
        eq(contactIdentities.channel, input.channel),
        inArray(contactIdentities.state, ["candidate", "observed"]),
      ),
    )
    .orderBy(asc(contactIdentities.createdAt))
    .limit(1);
  return row ?? null;
}

async function observeSecondaryPhone(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
  contactId: string,
) {
  if (!input.secondaryPhone) return;
  const secondaryInput = {
    ...input,
    identity: {
      kind: "phone" as const,
      normalizedValue: input.secondaryPhone,
    },
  };
  if (
    await findVerifiedIdentity(
      db,
      secondaryInput,
      "phone",
      input.secondaryPhone,
    )
  )
    return;
  const existing = await findObservedIdentity(db, secondaryInput);
  if (existing) {
    if (existing.contactId === contactId) return;
    return;
  }
  const [identity] = await db
    .insert(contactIdentities)
    .values({
      channel: input.channel,
      contactId: null,
      identityKind: "phone",
      normalizedValue: input.secondaryPhone,
      provider: input.provider,
      state: "candidate",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning({ id: contactIdentities.id });
  if (identity) await addCandidate(db, input, identity.id, contactId);
}

async function addCandidate(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
  identityId: string,
  contactId: string,
) {
  await db
    .insert(contactIdentityCandidates)
    .values({
      contactId,
      identityId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing();
}

async function findVerifiedIdentity(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
  kind: "phone" | "provider_subject",
  normalizedValue: string,
) {
  const [identity] = await db
    .select({
      id: contactIdentities.id,
      contactId: contactIdentities.contactId,
    })
    .from(contactIdentities)
    .where(
      and(
        eq(contactIdentities.tenantId, input.tenantId),
        eq(contactIdentities.storeId, input.storeId),
        eq(contactIdentities.identityKind, kind),
        eq(contactIdentities.normalizedValue, normalizedValue),
        eq(contactIdentities.provider, input.provider),
        eq(contactIdentities.channel, input.channel),
        eq(contactIdentities.state, "verified"),
      ),
    )
    .limit(1);
  return identity ?? null;
}

async function createContact(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
) {
  const [contact] = await db
    .insert(contacts)
    .values({
      displayName: input.contactDisplayName,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning({ id: contacts.id });
  return contact?.id ?? null;
}
