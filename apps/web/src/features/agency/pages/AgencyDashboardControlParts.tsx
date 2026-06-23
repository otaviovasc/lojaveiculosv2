import type { ReactNode } from "react";
import { Calendar, Search, X } from "lucide-react";

export function AgencyStatCard({
  icon,
  iconClass,
  label,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: number;
  valueClassName: string;
}) {
  return (
    <div className="agency-card p-6 flex items-center justify-between bg-gradient-to-br from-panel to-app-elevated">
      <div>
        <span className="text-[10px] font-black uppercase text-muted tracking-wider">
          {label}
        </span>
        <h3
          className={`text-3xl font-black italic tracking-tighter mt-1 ${valueClassName}`}
        >
          {value}
        </h3>
      </div>
      <div
        className={`size-12 rounded-2xl flex items-center justify-center font-bold ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  );
}

export function AgencySearchFilter({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="relative min-w-[200px]">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted size-4" />
      <input
        type="text"
        placeholder="Buscar loja ou subdomínio..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-app border border-line focus:border-accent/40 rounded-xl text-sm font-semibold outline-none transition-all"
      />
    </div>
  );
}

export function AgencySelect({
  children,
  icon,
  onChange,
  value,
}: {
  children: ReactNode;
  icon: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-4 pr-9 py-2.5 bg-app border border-line focus:border-accent/40 rounded-xl text-xs font-black uppercase tracking-wider outline-none appearance-none cursor-pointer"
      >
        {children}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
        {icon}
      </div>
    </div>
  );
}

export function AgencyDateFilter({
  from,
  onFromChange,
  onToChange,
  to,
}: {
  from: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  to: string;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-app border border-line p-1.5 rounded-xl">
      <Calendar className="text-muted size-3.5 shrink-0 ml-1" />
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="bg-transparent border-none text-[11px] font-bold outline-none text-primary w-[110px]"
        title="Término do plano - De"
      />
      <span className="text-muted text-[10px] font-black uppercase">até</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="bg-transparent border-none text-[11px] font-bold outline-none text-primary w-[110px]"
        title="Término do plano - Até"
      />
      {(from || to) && (
        <button
          onClick={() => {
            onFromChange("");
            onToChange("");
          }}
          className="p-1 hover:bg-line text-muted hover:text-primary rounded-lg transition-all"
          title="Limpar filtro de data"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
