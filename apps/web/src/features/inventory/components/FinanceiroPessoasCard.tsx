import { useState } from "react";
import { Users, Pencil, UserPlus, X } from "lucide-react";

interface PessoasData {
  proprietario: string;
  fornecedor: string;
  exProprietario: string;
  captadores: string[];
}

interface FinanceiroPessoasCardProps {
  pessoas: PessoasData;
  onSave: (data: PessoasData) => void;
}

export function FinanceiroPessoasCard({
  pessoas,
  onSave,
}: FinanceiroPessoasCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempPessoas, setTempPessoas] = useState<PessoasData>(pessoas);
  const [searchCaptador, setSearchCaptador] = useState("");
  const availableCaptadores = [
    "Carlos Cunha",
    "Ana Paula",
    "Bruno Ramos",
    "Daniel Silva",
    "Emerson Fittipaldi",
  ];

  const handleSave = () => {
    onSave(tempPessoas);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempPessoas(pessoas);
    setIsEditing(false);
  };

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col justify-between min-h-[360px]">
      <div>
        <div className="flex justify-between items-center border-b border-line pb-3 mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <Users className="size-4 text-muted" />
            <span>Pessoas</span>
          </h3>
          {!isEditing && (
            <button
              onClick={() => {
                setTempPessoas(pessoas);
                setIsEditing(true);
              }}
              className="p-1 rounded bg-transparent hover:bg-line/25 text-muted hover:text-accent cursor-pointer transition-all"
              title="Editar pessoas"
              type="button"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>

        {!isEditing ? (
          <div className="flex flex-col gap-4 text-xs font-bold">
            {[
              { label: "Proprietário", value: pessoas.proprietario },
              { label: "Fornecedor", value: pessoas.fornecedor },
              { label: "Ex-Proprietário", value: pessoas.exProprietario },
            ].map((row, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1 border-b border-line/30 pb-2"
              >
                <span className="text-[9px] uppercase tracking-wider text-muted">
                  {row.label}
                </span>
                <span className="text-app-text font-black">
                  {row.value || "-"}
                </span>
              </div>
            ))}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[9px] uppercase tracking-wider text-muted">
                Captadores
              </span>
              <div className="flex flex-wrap gap-1.5">
                {pessoas.captadores.length > 0 ? (
                  pessoas.captadores.map((cap) => (
                    <span
                      key={cap}
                      className="bg-accent-soft text-accent-strong text-[10px] font-black px-2 py-0.5 rounded-full border border-accent-soft/20"
                    >
                      {cap}
                    </span>
                  ))
                ) : (
                  <span className="text-muted font-bold">-</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 text-xs font-black">
            <div className="flex flex-col gap-1">
              <span>Proprietário</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="min-h-9 flex-1 rounded-lg border border-line bg-app px-3 text-xs font-bold outline-none"
                  value={tempPessoas.proprietario}
                  onChange={(e) =>
                    setTempPessoas({
                      ...tempPessoas,
                      proprietario: e.target.value,
                    })
                  }
                />
                <button
                  className="p-2 bg-app-elevated border border-line rounded-lg text-muted hover:text-accent cursor-pointer"
                  type="button"
                >
                  <UserPlus className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span>Fornecedor</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="min-h-9 flex-1 rounded-lg border border-line bg-app px-3 text-xs font-bold outline-none"
                  value={tempPessoas.fornecedor}
                  onChange={(e) =>
                    setTempPessoas({
                      ...tempPessoas,
                      fornecedor: e.target.value,
                    })
                  }
                />
                <button
                  className="p-2 bg-app-elevated border border-line rounded-lg text-muted hover:text-accent cursor-pointer"
                  type="button"
                >
                  <UserPlus className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span>Ex-Proprietário</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="min-h-9 flex-1 rounded-lg border border-line bg-app px-3 text-xs font-bold outline-none"
                  value={tempPessoas.exProprietario}
                  onChange={(e) =>
                    setTempPessoas({
                      ...tempPessoas,
                      exProprietario: e.target.value,
                    })
                  }
                />
                <button
                  className="p-2 bg-app-elevated border border-line rounded-lg text-muted hover:text-accent cursor-pointer"
                  type="button"
                >
                  <UserPlus className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <span>Captadores</span>
              <div className="flex gap-2">
                <select
                  className="min-h-9 flex-1 rounded-lg border border-line bg-app px-2 text-xs font-bold outline-none"
                  value={searchCaptador}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !tempPessoas.captadores.includes(val)) {
                      setTempPessoas({
                        ...tempPessoas,
                        captadores: [...tempPessoas.captadores, val],
                      });
                    }
                    setSearchCaptador("");
                  }}
                >
                  <option value="">Selecione para adicionar...</option>
                  {availableCaptadores.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tempPessoas.captadores.map((cap) => (
                  <span
                    key={cap}
                    className="inline-flex items-center gap-1 bg-accent-soft text-accent-strong text-[10px] font-black px-2 py-0.5 rounded-full border border-accent-soft/20"
                  >
                    <span>{cap}</span>
                    <button
                      onClick={() =>
                        setTempPessoas({
                          ...tempPessoas,
                          captadores: tempPessoas.captadores.filter(
                            (c) => c !== cap,
                          ),
                        })
                      }
                      className="hover:text-danger cursor-pointer transition-colors"
                      type="button"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="flex justify-end gap-2 border-t border-line/60 pt-4 mt-4">
          <button
            onClick={handleCancel}
            className="min-h-9 rounded-lg border border-line px-3.5 text-xs font-black hover:bg-line/25 transition-all cursor-pointer text-app-text"
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="min-h-9 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-4 flex items-center justify-center"
            type="button"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}
