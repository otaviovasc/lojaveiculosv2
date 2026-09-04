import {
  json,
  legacyMetadata,
  mapRole,
  nullableString,
  slugify,
  targetId,
} from "./common.mjs";
import { log, progress } from "./log.mjs";
import { mapLegacyFoundation } from "./foundation-mapping.mjs";
import { seedLegacyBilling } from "./target-billing.mjs";
import { addLegacyMap } from "./target-support.mjs";

export async function seedFoundation(tx, data, config, ids) {
  log("  Foundation: tenant/store...");
  const store = data.store;
  const customization = json(store.customization);
  const mapped = mapLegacyFoundation(data);
  const tradingName =
    nullableString(store.nome_da_loja, 191) ?? config.storeTradingName;
  const publicSlug =
    config.storeSlug ||
    nullableString(store.subdominio, 80) ||
    slugify(tradingName);

  await tx`INSERT INTO tenants (id, legal_name, slug, trading_name, created_at, updated_at)
    VALUES (${ids.tenant}, ${config.tenantLegalName || tradingName}, ${publicSlug}, ${tradingName}, ${store.data_criacao}, ${store.data_criacao})
    ON CONFLICT (id) DO UPDATE SET legal_name=excluded.legal_name, trading_name=excluded.trading_name, updated_at=excluded.updated_at`;
  await tx`INSERT INTO stores (id, legal_name, primary_domain, public_slug, tenant_id, trading_name, created_at, updated_at)
    VALUES (${ids.store}, ${config.storeLegalName || null}, ${store.dominio_customizado || null}, ${publicSlug}, ${ids.tenant}, ${tradingName}, ${store.data_criacao}, ${store.data_criacao})
    ON CONFLICT (id) DO UPDATE SET legal_name=excluded.legal_name, primary_domain=excluded.primary_domain, trading_name=excluded.trading_name, updated_at=excluded.updated_at`;

  await tx`INSERT INTO store_profiles
    (id, tenant_id, store_id, contact_email, contact_phone, whatsapp_phone, logo_image_url, address_line_1, address_line_2, address_city, address_state, address_zip_code, business_hours, document_number, metadata, created_at, updated_at)
    VALUES (${targetId(config.legacyStoreId, "store_profiles", store.id)}, ${ids.tenant}, ${ids.store},
      ${mapped.profile.contactEmail}, ${mapped.profile.contactPhone}, ${mapped.profile.whatsappPhone}, ${mapped.profile.logoImageUrl},
      ${mapped.profile.addressLine1}, ${mapped.profile.addressLine2}, ${mapped.profile.addressCity}, ${mapped.profile.addressState}, ${mapped.profile.addressZipCode},
      ${tx.json(mapped.profile.businessHours)}, ${mapped.profile.documentNumber},
      ${tx.json(legacyMetadata("Loja", store, { customization, settings: data.settings }))}, ${store.data_criacao}, ${store.data_criacao})
    ON CONFLICT (store_id) DO UPDATE SET contact_email=excluded.contact_email, contact_phone=excluded.contact_phone, whatsapp_phone=excluded.whatsapp_phone,
      logo_image_url=excluded.logo_image_url, address_line_1=excluded.address_line_1, address_line_2=excluded.address_line_2,
      address_city=excluded.address_city, address_state=excluded.address_state, address_zip_code=excluded.address_zip_code,
      business_hours=excluded.business_hours, document_number=excluded.document_number, metadata=excluded.metadata, updated_at=excluded.updated_at`;

  await tx`INSERT INTO store_public_site_settings
    (id, tenant_id, store_id, custom_domain, custom_domain_status, hero_image_url, is_published, layout_key, theme, created_at, updated_at)
    VALUES (${targetId(config.legacyStoreId, "store_public_site_settings", store.id)}, ${ids.tenant}, ${ids.store},
      ${nullableString(store.dominio_customizado, 191)}, ${store.dominio_customizado ? "pending" : "not_configured"},
      ${nullableString(customization.hero_image_url)}, true, ${mapped.layoutKey},
      ${tx.json(mapped.theme)}, ${store.data_criacao}, ${store.data_criacao})
    ON CONFLICT (store_id) DO UPDATE SET is_published=excluded.is_published, theme=excluded.theme, hero_image_url=excluded.hero_image_url, layout_key=excluded.layout_key, updated_at=excluded.updated_at`;

  const roleRows = await tx`SELECT id, role_key FROM role_templates`;
  const roles = Object.fromEntries(
    roleRows.map((row) => [row.role_key, row.id]),
  );
  for (const role of ["owner", "salesman", "supervisor"]) {
    if (!roles[role])
      throw new Error(
        `Missing V2 role template: ${role}. Run the normal V2 seed first.`,
      );
  }

  const ownerAccess = data.accesses.find(
    (access) => access.clerkUserId === store.ownerClerkId,
  );
  if (!ownerAccess) throw new Error("V1 owner has no LojaAccess row.");
  const orderedAccesses = [
    ownerAccess,
    ...data.accesses.filter((access) => access.id !== ownerAccess.id),
  ];
  log(`  Foundation: ${orderedAccesses.length} user(s)...`);
  for (const [index, access] of orderedAccesses.entries()) {
    if (index % 5 === 0 || index === orderedAccesses.length - 1) {
      progress("  Foundation users", index + 1, orderedAccesses.length);
    }
    const profile = json(access.profile);
    const isOwner = access.id === ownerAccess.id;
    const userId = targetId(
      config.legacyStoreId,
      "UserProfile",
      access.clerkUserId,
    );
    ids.users.set(access.clerkUserId, userId);
    const email = isOwner
      ? config.ownerEmail
      : (nullableString(profile.email, 254) ??
        config.accessEmails.get(access.id));
    if (!email) throw new Error(`LojaAccess ${access.id} has no email.`);
    await tx`INSERT INTO users (id, clerk_user_id, email, name, tenant_id, created_at, updated_at)
      VALUES (${userId}, ${isOwner ? config.ownerClerkUserId : null}, ${email.toLowerCase()}, ${profile.name || null}, ${ids.tenant}, ${profile.createdAt || access.createdAt}, ${profile.updatedAt || access.updatedAt})
      ON CONFLICT (id) DO UPDATE SET clerk_user_id=excluded.clerk_user_id, email=excluded.email, name=excluded.name, updated_at=excluded.updated_at`;
    const role = mapRole(access.role);
    const membershipId = targetId(
      config.legacyStoreId,
      "LojaAccess",
      access.id,
    );
    await tx`INSERT INTO store_memberships (id, role_template_id, status, store_id, tenant_id, user_id, created_at, updated_at)
      VALUES (${membershipId}, ${roles[role]}, ${isOwner ? "active" : "invited"}, ${ids.store}, ${ids.tenant}, ${userId}, ${access.createdAt}, ${access.updatedAt})
      ON CONFLICT (store_id, user_id) DO UPDATE SET role_template_id=excluded.role_template_id, status=excluded.status, updated_at=excluded.updated_at`;
    if (isOwner) {
      await tx`INSERT INTO tenant_memberships (id, role_template_id, status, tenant_id, user_id, created_at, updated_at)
        VALUES (${targetId(config.legacyStoreId, "tenant_memberships", access.id)}, ${roles.owner}, 'active', ${ids.tenant}, ${userId}, ${access.createdAt}, ${access.updatedAt})
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET status='active', updated_at=excluded.updated_at`;
      ids.ownerUser = userId;
    } else {
      await tx`INSERT INTO identity_invitations (id, email, invited_by_user_id, metadata, role_template_id, status, store_id, tenant_id, created_at, updated_at)
        VALUES (${targetId(config.legacyStoreId, "identity_invitations", access.id)}, ${email.toLowerCase()}, ${targetId(config.legacyStoreId, "UserProfile", ownerAccess.clerkUserId)},
          ${tx.json(legacyMetadata("LojaAccess", access, { pendingUserId: userId }))}, ${roles[role]}, 'pending', ${ids.store}, ${ids.tenant}, ${access.createdAt}, ${access.updatedAt})
        ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, updated_at=excluded.updated_at`;
    }
    await addLegacyMap(tx, ids.run, "LojaAccess", access.id, "users", userId);
  }

  await seedLegacyBilling(tx, data, config, ids);

  await addLegacyMap(tx, ids.run, "Loja", store.id, "stores", ids.store);
  log("  Foundation done");
}
