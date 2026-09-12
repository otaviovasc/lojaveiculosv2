import { foreignKey, type AnyPgColumn } from "drizzle-orm/pg-core";
import { stores } from "../identity.js";

export const scopedStoreForeignKey = <
  T extends { storeId: AnyPgColumn; tenantId: AnyPgColumn },
>(
  table: T,
  name: string,
) =>
  foreignKey({
    columns: [table.storeId, table.tenantId],
    foreignColumns: [stores.id, stores.tenantId],
    name,
  });
