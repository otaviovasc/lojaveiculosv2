import { ShieldCheck } from "lucide-react";

export function InventoryListHeader({
  available,
  hasMore,
  reserved,
  sold,
  total,
}: {
  available: number;
  hasMore: boolean;
  reserved: number;
  sold: number;
  total: number;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-accent-strong">
              Inventario V2
            </span>
            <span className="rounded-full bg-blue-soft px-3 py-1 text-app-text">
              Listing + unidade
            </span>
          </div>
          <h2 className="text-2xl font-black text-app-text lg:text-4xl">
            Gerenciar veiculos
          </h2>
          <p className="max-w-3xl text-sm font-bold text-muted">
            {total} veiculo(s) carregado(s), {available} disponivel(is),{" "}
            {reserved} reservado(s) e {sold} vendido(s).
            {hasMore ? " Use carregar mais para continuar." : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm font-black text-accent-strong">
          <ShieldCheck aria-hidden="true" className="size-4" />
          Permissoes e auditoria via V2
        </div>
      </div>
    </section>
  );
}
