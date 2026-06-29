import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import type { RoleKey } from "../types";

export function InviteMemberModal({
  isOpen,
  onClose,
  availableRoles,
}: {
  isOpen: boolean;
  onClose: () => void;
  availableRoles: { role: RoleKey; label: string }[];
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleKey>("salesman");
  const [status, setStatus] = useState<"idle" | "success">("idle");

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setName("");
      setRole("salesman");
      setStatus("idle");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("success");
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-line/45 bg-panel p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="size-12 text-emerald-500 animate-bounce" />
            <h4 className="text-base font-black text-app-text mt-4">
              Convite Enviado!
            </h4>
            <p className="text-xs font-bold text-muted mt-1 max-w-xs leading-relaxed">
              O convite de acesso foi enviado com sucesso para{" "}
              <strong className="text-app-text">{email}</strong>.
            </p>
          </div>
        ) : (
          <>
            <h4 className="text-base font-black text-app-text">
              Convidar Novo Membro
            </h4>
            <p className="text-xs font-bold text-muted mt-1 leading-relaxed">
              Envie um convite por e-mail para cadastrar um novo integrante na
              equipe de colaboradores da loja.
            </p>

            <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
              <label className="grid gap-1.5 text-xs font-bold text-app-text">
                <span>E-mail do Membro</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full min-h-10 rounded-lg border border-line bg-app px-3 text-sm font-bold text-app-text outline-none focus:border-accent"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-app-text">
                <span>Nome Completo (Opcional)</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full min-h-10 rounded-lg border border-line bg-app px-3 text-sm font-bold text-app-text outline-none focus:border-accent"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-app-text">
                <span>Cargo Padrão</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleKey)}
                  className="w-full min-h-10 rounded-lg border border-line bg-app px-3 text-sm font-bold text-app-text outline-none focus:border-accent"
                >
                  {availableRoles.map((item) => (
                    <option key={item.role} value={item.role}>
                      {item.label}
                    </option>
                  ))}
                </select>
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
                  Enviar Convite
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
