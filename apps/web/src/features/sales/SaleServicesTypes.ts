import type { SaleRecord } from "./types";

export type UpdateSale = (updater: (sale: SaleRecord) => SaleRecord) => void;
export type ActiveServiceTab =
  "financing" | "insurance" | "commission" | "tradeIn";
export type ServiceChangeHandler = (
  serviceKey: ActiveServiceTab,
  field: string,
  value: unknown,
) => void;
