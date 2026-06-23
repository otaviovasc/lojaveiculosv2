import { Users, Shield, Plus, Key } from "lucide-react";

export function AgencyTeamAccessPage() {
  const members = [
    {
      name: "Marlos Nogueira",
      email: "marlos@agency.com",
      role: "Administrador da Agência",
      status: "Ativo",
    },
    {
      name: "Juliana Costa",
      email: "juliana@agency.com",
      role: "Operador de Suporte",
      status: "Ativo",
    },
    {
      name: "Rodrigo Melo",
      email: "rodrigo@agency.com",
      role: "Visualizador Financeiro",
      status: "Convidado",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-8 px-4 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">
            Controle de Equipe
          </span>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary mt-1">
            Acessos de Equipe
          </h1>
          <p className="text-muted text-sm font-semibold mt-1">
            Gerencie quem na sua agência tem permissão para administrar as
            concessionárias.
          </p>
        </div>

        <button className="btn-gradient">
          <Plus className="size-5" />
          <span>Convidar Membro</span>
        </button>
      </div>

      <div className="agency-card overflow-hidden">
        <table className="agency-table">
          <thead>
            <tr>
              <th className="text-left">Membro</th>
              <th className="text-left">Cargo</th>
              <th className="text-center">Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.email}>
                <td>
                  <div className="flex flex-col">
                    <span className="font-black text-primary">
                      {member.name}
                    </span>
                    <span className="text-muted text-xs font-mono">
                      {member.email}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Shield className="size-3.5 text-accent" />
                    <span>{member.role}</span>
                  </div>
                </td>
                <td className="text-center">
                  <span className="badge-flat badge-active text-[10px]">
                    {member.status}
                  </span>
                </td>
                <td className="text-right">
                  <button className="btn-secondary-flat py-1 px-3.5 text-[10px]">
                    <Key className="size-3" />
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
