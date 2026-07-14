import type { SaleSellerOption } from "../sales/saleContextOptions";
import type { AutoEntryRule, AutoEntryRuleMutation } from "./types";

export type AutoEntryDomainPanelProps = {
  canManage: boolean;
  isSaving: boolean;
  onDelete: (rule: AutoEntryRule) => void;
  onSave: (mutations: readonly AutoEntryRuleMutation[]) => Promise<void>;
  rules: readonly AutoEntryRule[];
  sellers: readonly SaleSellerOption[];
};
