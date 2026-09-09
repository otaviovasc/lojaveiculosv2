import { LoaderCircle, Search, UserRound, X } from "lucide-react";
import { useState } from "react";
import {
  useCrmSellerOptions,
  type CrmSellerOption,
} from "./useCrmSellerOptions";

export type CrmResponsibleFilterDropdownProps = {
  assignee?: string | undefined;
  hasUserContext?: boolean | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSelectAssignee: (assignee: string | undefined) => void;
  onToggleOpen: () => void;
  // Optional test / dependency injection overrides
  sellerMembers?: CrmSellerOption[] | undefined;
  isLoadingMembers?: boolean | undefined;
  memberError?: Error | null | undefined;
  onRetryMembers?: (() => void) | undefined;
};

export function CrmResponsibleFilterDropdown({
  assignee,
  hasUserContext = false,
  isOpen,
  onClose,
  onSelectAssignee,
  onToggleOpen,
  sellerMembers,
  isLoadingMembers,
  memberError,
  onRetryMembers,
}: CrmResponsibleFilterDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const hookData = useCrmSellerOptions(!sellerMembers && isOpen);
  const members = sellerMembers ?? hookData.members;
  const isLoading =
    isLoadingMembers ?? (sellerMembers ? false : hookData.isLoading);
  const error = memberError ?? (sellerMembers ? null : hookData.error);
  const handleRetry = onRetryMembers ?? hookData.retry;

  const isFiltered = Boolean(assignee && assignee !== "all");

  const getLabel = () => {
    if (!assignee || assignee === "all") return "Responsável";
    if (assignee === "me") return "Meus leads";
    if (assignee === "assigned") return "Com responsável";
    if (assignee === "unassigned") return "Sem responsável";
    const member = members.find((m) => m.id === assignee);
    return member?.name ?? "Responsável";
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch = (text: string) =>
    !normalizedQuery || text.toLowerCase().includes(normalizedQuery);

  const filteredMembers = members.filter(
    (m) => matchesSearch(m.name) || matchesSearch(m.email),
  );

  return (
    <div className="relative inline-flex items-center">
      <div
        className={
          "inline-flex min-h-9 items-center rounded-full border text-xs font-black transition-colors " +
          (isFiltered
            ? "border-accent bg-accent/15 text-accent"
            : "border-line/50 bg-app-elevated/45 text-app-text hover:bg-line/25")
        }
      >
        <button
          aria-expanded={isOpen}
          aria-label="Filtrar por responsável"
          className="inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-black cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => {
            onToggleOpen();
            setSearchQuery("");
          }}
          type="button"
        >
          <UserRound className="size-3 text-muted" />
          <span className="max-w-[140px] truncate">{getLabel()}</span>
        </button>
        {isFiltered && (
          <button
            aria-label="Limpar filtro de responsável"
            className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full text-app-text hover:bg-line/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelectAssignee(undefined);
            }}
            type="button"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-64 bg-panel border border-line rounded-xl shadow-xl p-2 flex flex-col gap-1.5 text-app-text">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3 text-muted" />
            <input
              aria-label="Buscar responsável"
              className="min-h-8 w-full rounded-md border border-line bg-app pl-7 pr-2 text-xs font-bold text-app-text outline-none placeholder:text-muted"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar responsável..."
              type="text"
              value={searchQuery}
            />
          </div>

          <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
            {matchesSearch("Todos") && (
              <button
                className={
                  "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors " +
                  (!isFiltered
                    ? "bg-accent/15 text-accent"
                    : "hover:bg-line/10 text-app-text")
                }
                onClick={() => {
                  onSelectAssignee(undefined);
                  onClose();
                }}
                type="button"
              >
                Todos
              </button>
            )}

            {hasUserContext && matchesSearch("Meus leads") && (
              <button
                className={
                  "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors " +
                  (assignee === "me"
                    ? "bg-accent/15 text-accent"
                    : "hover:bg-line/10 text-app-text")
                }
                onClick={() => {
                  onSelectAssignee("me");
                  onClose();
                }}
                type="button"
              >
                Meus leads
              </button>
            )}

            {matchesSearch("Com responsável") && (
              <button
                className={
                  "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors " +
                  (assignee === "assigned"
                    ? "bg-accent/15 text-accent"
                    : "hover:bg-line/10 text-app-text")
                }
                onClick={() => {
                  onSelectAssignee("assigned");
                  onClose();
                }}
                type="button"
              >
                Com responsável
              </button>
            )}

            {matchesSearch("Sem responsável") && (
              <button
                className={
                  "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors " +
                  (assignee === "unassigned"
                    ? "bg-accent/15 text-accent"
                    : "hover:bg-line/10 text-app-text")
                }
                onClick={() => {
                  onSelectAssignee("unassigned");
                  onClose();
                }}
                type="button"
              >
                Sem responsável
              </button>
            )}

            <div className="border-t border-line/40 my-1" />
            <span className="px-2 py-0.5 text-xs font-black uppercase tracking-wider text-muted">
              Membros da loja
            </span>

            {isLoading && (
              <div
                aria-label="Carregando membros..."
                className="flex items-center justify-center gap-2 py-3 text-xs text-muted"
                role="status"
              >
                <LoaderCircle className="size-3.5 animate-spin" />
                <span>Carregando membros...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-1.5 py-2 px-1 text-center">
                <span className="text-xs text-danger font-bold">
                  Não foi possível carregar os membros.
                </span>
                <button
                  className="text-xs text-accent underline hover:opacity-80 font-black cursor-pointer"
                  onClick={handleRetry}
                  type="button"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {!isLoading &&
              !error &&
              filteredMembers.map((member) => (
                <button
                  className={
                    "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors truncate " +
                    (assignee === member.id
                      ? "bg-accent/15 text-accent"
                      : "hover:bg-line/10 text-app-text")
                  }
                  key={member.id}
                  onClick={() => {
                    onSelectAssignee(member.id);
                    onClose();
                  }}
                  type="button"
                >
                  {member.name}
                </button>
              ))}

            {!isLoading && !error && filteredMembers.length === 0 && (
              <span className="text-xs text-muted text-center py-2">
                Nenhum membro encontrado
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
