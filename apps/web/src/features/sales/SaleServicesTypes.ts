import type { SaleRecord } from "./types";

export type UpdateSale = (updater: (sale: SaleRecord) => SaleRecord) => void;
export type ActiveServiceTab =
  "commission" | "documentation" | "financing" | "insurance" | "tradeIn";
export type ServiceChangeHandler = (
  serviceKey: ActiveServiceTab,
  field: string,
  value: unknown,
) => void;
