export function OpcionaisDrawer({
  isOpen,
  onClose,
  opcionais,
  onToggle,
}: {
  isOpen: boolean;
  onClose: () => void;
  opcionais: readonly { id: string; label: string; checked: boolean }[];
  onToggle: (id: string) => void;
}) {
  if (!isOpen) return null;

  const countChecked = opcionais.filter((o) => o.checked).length;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-[420px] max-w-[90vw] bg-panel z-50 shadow-2xl border-l border-line p-6 overflow-y-auto flex flex-col gap-5 text-app-text">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black uppercase tracking-wider">
              Opcionais do Veículo
            </h3>
            <span className="bg-accent-soft text-accent-strong text-xs font-black px-2 py-0.5 rounded-full">
              {countChecked}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-app-text font-black text-sm cursor-pointer"
            type="button"
          >
            Fechar
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {opcionais.map((o) => (
            <label
              key={o.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-line bg-app hover:bg-panel cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                checked={o.checked}
                onChange={() => onToggle(o.id)}
                className="size-4.5 rounded border-line text-accent focus:ring-accent accent-accent cursor-pointer animate-none"
              />
              <span className="text-xs font-bold text-app-text">{o.label}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
