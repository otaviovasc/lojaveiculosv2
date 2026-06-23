import type { ReactNode } from "react";
import { Search } from "lucide-react";

export function AgencyRowButton({
  icon,
  label,
  onClick,
  title,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-secondary-flat py-1.5 px-3 text-xs"
      title={title}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function AgencyEmptyStores({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <div className="p-20 text-center flex flex-col items-center">
      <div className="w-16 h-16 bg-app-elevated rounded-2xl flex items-center justify-center mb-6">
        <Search className="size-6 text-muted" />
      </div>
      <h3 className="text-lg font-black text-primary mb-1">
        Nenhum resultado encontrado
      </h3>
      <p className="text-muted text-xs font-semibold max-w-sm">
        Não encontramos nenhuma loja que corresponda aos filtros ativos.
      </p>
      <button
        onClick={onClearFilters}
        className="mt-6 btn-secondary-flat text-xs"
      >
        Limpar Todos Filtros
      </button>
    </div>
  );
}
