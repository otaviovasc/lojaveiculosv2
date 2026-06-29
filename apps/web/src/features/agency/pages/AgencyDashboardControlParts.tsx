import { Calendar, X } from "lucide-react";

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
