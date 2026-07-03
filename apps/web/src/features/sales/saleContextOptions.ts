import { createProductCrmApi } from "../crm/productCrmApi";
import { createProductCrmApiOptions } from "../crm/runtimeApi";
import { createInventoryApi } from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import type {
  InventoryListingSummary,
  InventoryUnitStatus,
} from "../inventory/model/types";
import { createSettingsApi } from "../settings/apiClient";
import { createSettingsApiOptions } from "../settings/runtimeApi";
import type { RoleKey, RoleMemberView } from "../settings/types";
import type { ProductCrmLead } from "../crm/productCrmTypes";

export type SaleLeadOption = {
  buyerEmail: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  detail: string;
  id: string;
  label: string;
  listingId: string | null;
  vehicleTitle: string | null;
};

export type SaleUnitOption = {
  detail: string;
  id: string;
  label: string;
  listingId: string;
  listingTitle: string;
  priceCents: number | null;
  unitLabel: string;
};

export type SaleSellerOption = {
  detail: string;
  id: string;
  label: string;
  role: RoleKey;
};

export type SaleSellerSeed = {
  email: string;
  id: string;
  name: string | null;
  role: string | null;
};

export type SaleContextOptions = {
  leads: readonly SaleLeadOption[];
  sellers: readonly SaleSellerOption[];
  units: readonly SaleUnitOption[];
};

export type SaleContextOptionsState =
  | { kind: "error"; message: string; options: SaleContextOptions }
  | { kind: "loading"; options: SaleContextOptions }
  | { kind: "ready"; options: SaleContextOptions };

export const emptySaleContextOptions: SaleContextOptions = {
  leads: [],
  sellers: [],
  units: [],
};

export async function loadSaleContextOptions(
  sellerSeed?: SaleSellerSeed | null,
): Promise<SaleContextOptionsState> {
  const seededSeller = sellerSeed ? toSeedSellerOption(sellerSeed) : null;
  const [leadResult, unitResult, sellerResult] = await Promise.allSettled([
    loadLeadOptions(),
    loadUnitOptions(),
    loadSellerOptions(seededSeller),
  ]);

  const options = {
    leads: fulfilledOrEmpty(leadResult),
    sellers: fulfilledOrEmpty(sellerResult),
    units: fulfilledOrEmpty(unitResult),
  };
  const failures = [leadResult, unitResult, sellerResult].filter(
    (result) => result.status === "rejected",
  );

  if (failures.length > 0) {
    return {
      kind: "error",
      message: "Algumas listas vinculadas nao puderam ser carregadas.",
      options,
    };
  }

  return { kind: "ready", options };
}

async function loadLeadOptions() {
  const api = createProductCrmApi(await createProductCrmApiOptions());
  return (await api.listLeads({ limit: 100 })).map(toLeadOption);
}

async function loadUnitOptions() {
  const api = createInventoryApi(await createInventoryApiOptions());
  const result = await api.listListings({ limit: 100 });
  return result.items.flatMap(toUnitOptions);
}

async function loadSellerOptions(seed: SaleSellerOption | null) {
  const seeded = seed ? [seed] : [];
  const api = createSettingsApi(await createSettingsApiOptions());
  try {
    const roles = await api.getRoleManagement();
    return mergeSellerOptions(
      seeded,
      roles.memberships
        .filter((member) => member.status === "active")
        .map(toSellerOption),
    );
  } catch (error) {
    if (seeded.length > 0) return seeded;
    throw error;
  }
}

function fulfilledOrEmpty<T>(
  result: PromiseSettledResult<readonly T[]>,
): readonly T[] {
  return result.status === "fulfilled" ? result.value : [];
}

function toLeadOption(lead: ProductCrmLead): SaleLeadOption {
  const label = lead.buyerName || lead.buyerPhone || lead.buyerEmail || lead.id;
  const detailParts = [
    lead.vehicleTitle,
    lead.buyerPhone,
    lead.buyerEmail,
  ].filter(Boolean);

  return {
    buyerEmail: lead.buyerEmail,
    buyerName: lead.buyerName,
    buyerPhone: lead.buyerPhone,
    detail: detailParts.length ? detailParts.join(" · ") : "Lead sem contato",
    id: lead.id,
    label,
    listingId: lead.listingId,
    vehicleTitle: lead.vehicleTitle,
  };
}

function toUnitOptions(item: InventoryListingSummary): SaleUnitOption[] {
  const units =
    item.units.length > 0
      ? item.units
      : item.primaryUnit
        ? [item.primaryUnit]
        : [];

  return units.map((unit) => {
    const unitLabel = unit.stockNumber || unit.plate || shortId(unit.id);
    const detailParts = [
      unitLabel,
      unit.plate,
      statusLabel(unit.status),
      formatCents(item.listing.priceCents),
    ].filter(Boolean);

    return {
      detail: detailParts.join(" · "),
      id: unit.id,
      label: `${item.listing.title} · ${unitLabel}`,
      listingId: item.listing.id,
      listingTitle: item.listing.title,
      priceCents: item.listing.priceCents,
      unitLabel,
    };
  });
}

function toSellerOption(member: RoleMemberView): SaleSellerOption {
  return {
    detail: `${roleLabel(member.role)} · ${member.user.email}`,
    id: member.user.id,
    label: member.user.name || member.user.email,
    role: member.role,
  };
}

function toSeedSellerOption(seed: SaleSellerSeed): SaleSellerOption {
  const role = toRoleKey(seed.role);
  return {
    detail: `${roleLabel(role)} · ${seed.email}`,
    id: seed.id,
    label: seed.name || seed.email,
    role,
  };
}

function mergeSellerOptions(
  seeded: readonly SaleSellerOption[],
  loaded: readonly SaleSellerOption[],
) {
  const loadedIds = new Set(loaded.map((option) => option.id));
  return [...seeded.filter((option) => !loadedIds.has(option.id)), ...loaded];
}

function statusLabel(status: InventoryUnitStatus) {
  const labels: Record<InventoryUnitStatus, string> = {
    acquired: "Adquirido",
    available: "Disponivel",
    delivered: "Entregue",
    inactive: "Inativo",
    in_preparation: "Em preparacao",
    reserved: "Reservado",
    sold: "Vendido",
  };
  return labels[status];
}

function roleLabel(role: RoleKey) {
  return roleLabels[role];
}

function toRoleKey(role: string | null | undefined): RoleKey {
  return isRoleKey(role) ? role : "salesman";
}

function isRoleKey(role: string | null | undefined): role is RoleKey {
  return (
    typeof role === "string" &&
    Object.prototype.hasOwnProperty.call(roleLabels, role)
  );
}

const roleLabels: Record<RoleKey, string> = {
  admin: "Admin",
  agency: "Agencia",
  investor: "Investidor",
  owner: "Proprietario",
  salesman: "Vendedor",
  supervisor: "Supervisor",
};

function formatCents(value: number | null) {
  if (!value) return null;
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value / 100);
}

function shortId(value: string) {
  return value.slice(0, 8);
}
