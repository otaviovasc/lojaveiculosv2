import { useState } from "react";

export function CustomRoleModal({
  isOpen,
  onClose,
  baseRoleLabel,
  exceptionsCount,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  baseRoleLabel: string;
  exceptionsCount: number;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-line/45 bg-panel p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h4 className="text-base font-black text-app-text">
          Salvar como Cargo Customizado
        </h4>
        <p className="text-xs font-bold text-muted mt-1 leading-relaxed">
          Isso salvará a configuração atual de cargo base ({baseRoleLabel}) e as{" "}
          {exceptionsCount} exceções configuradas como um preset reutilizável na
          loja.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              onCreate(name.trim());
              setName("");
            }
          }}
          className="grid gap-4 mt-4"
        >
          <label className="grid gap-1.5 text-xs font-bold text-app-text">
            <span>Nome do Cargo Customizado</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendedor Sênior, Supervisor Especial"
              className="w-full min-h-10 rounded-lg border border-line bg-app px-3 text-sm font-bold text-app-text outline-none focus:border-accent"
            />
          </label>

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-line bg-panel px-4 text-xs font-black text-muted hover:text-app-text cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-accent px-4 text-xs font-black text-inverse hover:bg-accent-strong cursor-pointer"
            >
              Criar Cargo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
