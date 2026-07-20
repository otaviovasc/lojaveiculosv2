import {
  json,
  legacyMetadata,
  mapFuel,
  mapLeadSource,
  mapTransmission,
  nullableString,
  slugify,
  targetId,
} from "./common.mjs";
import { addLegacyMap } from "./target-foundation.mjs";

export async function seedInventory(tx, data, config, ids) {
  for (const vehicle of data.vehicles) {
    const listingId = targetId(
      config.legacyStoreId,
      "Veiculo:listing",
      vehicle.id,
    );
    const unitId = targetId(config.legacyStoreId, "Veiculo:unit", vehicle.id);
    ids.listings.set(vehicle.id, listingId);
    ids.units.set(vehicle.id, unitId);
    const sold = vehicle.status_anuncio === "VENDIDO";
    const vehicleType =
      vehicle.tipo_veiculo === "Moto" ? "motorcycles" : "cars";
    const catalog = {
      brandCode: vehicle.brand?.codigo_fipe ?? null,
      brandName: vehicle.brand?.nome_marca ?? null,
      fipeCode: vehicle.codigo_fipe ?? vehicle.model?.fipeCode ?? null,
      fuel: vehicle.combustivel ?? null,
      modelCode: vehicle.model?.codigo_modelo ?? null,
      modelName: vehicle.model?.nome_modelo ?? null,
      modelYear: vehicle.ano_modelo ?? null,
      priceCents: vehicle.preco_fipe
        ? Math.round(Number(vehicle.preco_fipe) * 100)
        : null,
      referenceMonth: vehicle.mes_referencia_fipe ?? null,
      source: vehicle.codigo_fipe ? "fipe" : null,
      vehicleType,
      yearCode: null,
      yearName: vehicle.ano_modelo ? String(vehicle.ano_modelo) : null,
    };
    const metadata = legacyMetadata("Veiculo", vehicle, {
      catalog,
      videoUrl: vehicle.video_url ?? null,
    });
    await tx`INSERT INTO vehicle_listings
      (id, asking_price_cents, condition, description, doors, engine_aspiration, engine_displacement, fuel_type, is_visible_on_public_site, manufacture_year, metadata, mileage_km, model_year, public_slug, status, store_id, tenant_id, title, transmission, trim_name, created_at, updated_at)
      VALUES (${listingId}, ${money(vehicle.preco)}, 'used', ${vehicle.descricao_detalhada || null}, ${vehicle.portas || null}, ${mapAspiration(vehicle.aspiracao)},
        ${nullableString(vehicle.cilindrada, 32)}, ${mapFuel(vehicle.combustivel)}, ${!sold}, ${vehicle.ano_fabricacao || null}, ${tx.json(metadata)},
        ${vehicle.km || null}, ${vehicle.ano_modelo || null}, ${`legacy-${vehicle.id}-${slugify(vehicle.titulo_anuncio).slice(0, 140)}`},
        ${sold ? "sold_out" : "published"}, ${ids.store}, ${ids.tenant}, ${vehicle.titulo_anuncio || `Veículo ${vehicle.id}`},
        ${mapTransmission(vehicle.cambio)}, ${nullableString(vehicle.versao, 160)}, ${vehicle.data_cadastro}, ${vehicle.data_atualizacao})
      ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, status=excluded.status, updated_at=excluded.updated_at`;
    await tx`INSERT INTO vehicle_units
      (id, acquisition_date, color_name, listing_id, plate, status, store_id, tenant_id, vin, created_at, updated_at)
      VALUES (${unitId}, ${vehicle.data_cadastro}, ${nullableString(vehicle.cor, 64)}, ${listingId}, ${nullableString(vehicle.placa_final, 16)?.toUpperCase() ?? null}, ${sold ? "sold" : "available"},
        ${ids.store}, ${ids.tenant}, ${nullableString(vehicle.chassi, 32)}, ${vehicle.data_cadastro}, ${vehicle.data_atualizacao})
      ON CONFLICT (id) DO UPDATE SET plate=excluded.plate, status=excluded.status, updated_at=excluded.updated_at`;
    await addLegacyMap(
      tx,
      ids.run,
      "Veiculo",
      vehicle.id,
      "vehicle_units",
      unitId,
    );
  }

  for (const photo of data.photos) {
    const unitId = required(ids.units, photo.veiculoId, "photo vehicle");
    await tx`INSERT INTO vehicle_media
      (id, display_order, is_public, kind, metadata, storage_key, store_id, tenant_id, unit_id, url, created_at, updated_at)
      VALUES (${targetId(config.legacyStoreId, "FotosVeiculo", photo.id)}, ${photo.ordem || 0}, true, 'photo', ${tx.json(legacyMetadata("FotosVeiculo", photo))},
        ${photo.s3_key}, ${ids.store}, ${ids.tenant}, ${unitId}, ${photo.url_foto}, ${photo.data_upload}, ${photo.data_upload})
      ON CONFLICT (id) DO UPDATE SET url=excluded.url, storage_key=excluded.storage_key, display_order=excluded.display_order`;
  }

  for (const checklist of data.checklists) {
    await tx`INSERT INTO vehicle_checklists
      (id, items, name, status, store_id, tenant_id, unit_id, created_at, updated_at)
      VALUES (${targetId(config.legacyStoreId, "VehicleChecklist", checklist.id)}, ${tx.json([legacyMetadata("VehicleChecklist", checklist)])},
        'Checklist legado', 'passed', ${ids.store}, ${ids.tenant}, ${required(ids.units, checklist.veiculoId, "checklist vehicle")}, ${checklist.createdAt}, ${checklist.updatedAt})
      ON CONFLICT (id) DO UPDATE SET items=excluded.items, updated_at=excluded.updated_at`;
  }
}

export async function seedCrm(tx, data, config, ids) {
  const pipelineId = targetId(
    config.legacyStoreId,
    "crm_pipeline",
    config.legacyStoreId,
  );
  await tx`INSERT INTO crm_pipelines (id, description, is_default, name, store_id, tenant_id, created_at, updated_at)
    VALUES (${pipelineId}, 'Migrado do Loja Veículos V1', true, 'Pipeline legado', ${ids.store}, ${ids.tenant}, now(), now())
    ON CONFLICT (id) DO UPDATE SET updated_at=now()`;
  for (const column of data.columns) {
    const stageId = targetId(config.legacyStoreId, "LeadColumn", column.id);
    ids.stages.set(column.id, stageId);
    const status = stageStatus(column.name);
    await tx`INSERT INTO crm_pipeline_stages
      (id, color, is_system, lead_status, name, pipeline_id, sort_order, status, store_id, tenant_id, created_at, updated_at)
      VALUES (${stageId}, ${column.color || "#64748b"}, false, ${status === "won" ? "won" : status === "lost" ? "lost" : "new"},
        ${column.name}, ${pipelineId}, ${column.position || 0}, ${status}, ${ids.store}, ${ids.tenant}, ${column.createdAt}, ${column.updatedAt})
      ON CONFLICT (id) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order, updated_at=excluded.updated_at`;
  }
  const soldLeadIds = new Set(
    data.sales.map((sale) => sale.leadId).filter(Boolean),
  );
  for (const lead of data.leads) {
    const leadId = targetId(config.legacyStoreId, "Lead", lead.id);
    ids.leads.set(lead.id, leadId);
    const stageStatusValue = stageStatus(
      data.columns.find((column) => column.id === lead.columnId)?.name,
    );
    const status = soldLeadIds.has(lead.id)
      ? "won"
      : stageStatusValue === "lost"
        ? "lost"
        : "new";
    await tx`INSERT INTO leads
      (id, assigned_user_id, buyer_email, buyer_name, buyer_phone, metadata, pipeline_id, pipeline_stage_id, source, status, store_id, tenant_id, created_at, updated_at)
      VALUES (${leadId}, ${ids.users.get(lead.crm_agent_clerk_user_id) || null}, ${nullableString(lead.email, 254)}, ${nullableString(lead.name, 191)},
        ${nullableString(lead.phone, 40)}, ${tx.json(legacyMetadata("Lead", lead))}, ${pipelineId}, ${ids.stages.get(lead.columnId) || null},
        ${mapLeadSource(lead.source)}, ${status}, ${ids.store}, ${ids.tenant}, ${lead.createdAt}, ${lead.updatedAt})
      ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, status=excluded.status, updated_at=excluded.updated_at`;
    await addLegacyMap(tx, ids.run, "Lead", lead.id, "leads", leadId);
  }
  for (const interaction of data.interactions)
    await seedActivity(
      tx,
      interaction,
      "LeadInteraction",
      interaction.note || "Interação migrada",
      "note",
      ids,
      config,
    );
  for (const task of data.tasks)
    await seedActivity(
      tx,
      task,
      "LeadTask",
      task.title || task.description || "Tarefa migrada",
      "task",
      ids,
      config,
    );
  for (const interest of data.interests) {
    const listingId = required(
      ids.listings,
      interest.veiculoId,
      "interested vehicle",
    );
    await tx`INSERT INTO lead_vehicle_interests (id, lead_id, listing_id, store_id, tenant_id, unit_id, created_at, updated_at)
      VALUES (${targetId(config.legacyStoreId, "LeadInterestedVehicle", interest.id)}, ${required(ids.leads, interest.leadId, "interest lead")},
        ${listingId}, ${ids.store}, ${ids.tenant}, ${ids.units.get(interest.veiculoId) || null}, ${interest.createdAt}, ${interest.createdAt})
      ON CONFLICT (id) DO NOTHING`;
  }
}

async function seedActivity(
  tx,
  row,
  table,
  content,
  activityType,
  ids,
  config,
) {
  await tx`INSERT INTO lead_activities
    (id, activity_type, content, direction, idempotency_key, lead_id, metadata, occurred_at, store_id, tenant_id, created_at, updated_at)
    VALUES (${targetId(config.legacyStoreId, table, row.id)}, ${activityType}, ${content}, 'internal', ${`v1:${table}:${row.id}`},
      ${required(ids.leads, row.leadId, `${table} lead`)}, ${tx.json(legacyMetadata(table, row))}, ${row.createdAt}, ${ids.store}, ${ids.tenant}, ${row.createdAt}, ${row.updatedAt || row.createdAt})
    ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, updated_at=excluded.updated_at`;
}

function stageStatus(name) {
  const normalized = String(name ?? "").toLowerCase();
  if (normalized.includes("vend") || normalized.includes("ganh")) return "won";
  if (normalized.includes("perdid") || normalized.includes("descart"))
    return "lost";
  return "open";
}

function mapAspiration(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("turbo")) return "turbo";
  if (normalized.includes("super")) return "supercharged";
  if (normalized.includes("natural") || normalized.includes("aspirad"))
    return "aspirated";
  return null;
}

function money(value) {
  return value === null || value === undefined
    ? null
    : Math.round(Number(value) * 100);
}

function required(map, key, label) {
  const value = map.get(key);
  if (!value) throw new Error(`Missing ${label} mapping for V1 id ${key}`);
  return value;
}
