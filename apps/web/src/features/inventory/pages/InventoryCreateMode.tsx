import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { InventoryCreatePage } from "./InventoryCreatePage";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryRouteState } from "../model/inventoryRouteState";

export function InventoryCreateMode({
  api,
  initialStep,
  onBack,
}: {
  api?: InventoryApi | undefined;
  initialStep: InventoryRouteState["createStep"];
  onBack: () => void;
}) {
  return (
    <div className="relative min-h-screen store-dashboard overflow-hidden">
      <div className="fixed inset-0 bg-logo-pattern pointer-events-none" />
      <div className="dashboard-main relative z-10 flex flex-col gap-6">
        <section className="flex justify-start px-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-soft px-4 text-sm font-black text-accent-strong cursor-pointer border border-accent-soft/20 shadow-sm"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>Voltar ao estoque</span>
          </motion.button>
        </section>
        <InventoryCreatePage api={api} initialStep={initialStep} />
      </div>
    </div>
  );
}
