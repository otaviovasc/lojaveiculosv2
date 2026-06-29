import { FeatureDrawer } from "../../../components/ui/FeatureOverlay";

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
    <FeatureDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          Opcionais do Veículo
          <span className="bg-accent-soft text-accent-strong text-xs font-black px-2 py-0.5 rounded-full">
            {countChecked}
          </span>
        </span>
      }
    >
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
    </FeatureDrawer>
  );
}
