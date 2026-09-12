// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmResponsibleFilterDropdown } from "./CrmResponsibleFilterDropdown";

describe("CrmResponsibleFilterDropdown", () => {
  afterEach(cleanup);

  const mockMembers = [
    {
      email: "vendedor1@loja.com",
      id: "user-1",
      name: "João Silva",
      role: "salesman",
    },
    {
      email: "vendedora2@loja.com",
      id: "user-2",
      name: "Maria Santos",
      role: "salesman",
    },
  ];

  it("renders trigger button and opens menu on click", () => {
    const onToggleOpen = vi.fn();
    render(
      <CrmResponsibleFilterDropdown
        isOpen={false}
        onClose={vi.fn()}
        onSelectAssignee={vi.fn()}
        onToggleOpen={onToggleOpen}
      />,
    );

    const btn = screen.getByRole("button", { name: "Filtrar por responsável" });
    expect(btn).toBeInTheDocument();
    expect(screen.getByText("Responsável")).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onToggleOpen).toHaveBeenCalledTimes(1);
  });

  it("renders static choices and active store members when open with user context", () => {
    const onSelectAssignee = vi.fn();
    const onClose = vi.fn();

    render(
      <CrmResponsibleFilterDropdown
        hasUserContext={true}
        isOpen={true}
        onClose={onClose}
        onSelectAssignee={onSelectAssignee}
        onToggleOpen={vi.fn()}
        sellerMembers={mockMembers}
      />,
    );

    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Meus leads" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Com responsável" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sem responsável" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "João Silva" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Maria Santos" }),
    ).toBeInTheDocument();

    // Select "Meus leads"
    fireEvent.click(screen.getByRole("button", { name: "Meus leads" }));
    expect(onSelectAssignee).toHaveBeenCalledWith("me");
    expect(onClose).toHaveBeenCalledTimes(1);

    // Select a member
    fireEvent.click(screen.getByRole("button", { name: "João Silva" }));
    expect(onSelectAssignee).toHaveBeenCalledWith("user-1");
  });

  it("hides Meus leads when hasUserContext is false", () => {
    render(
      <CrmResponsibleFilterDropdown
        hasUserContext={false}
        isOpen={true}
        onClose={vi.fn()}
        onSelectAssignee={vi.fn()}
        onToggleOpen={vi.fn()}
        sellerMembers={mockMembers}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Meus leads" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
  });

  it("filters members using the search input", () => {
    render(
      <CrmResponsibleFilterDropdown
        hasUserContext={true}
        isOpen={true}
        onClose={vi.fn()}
        onSelectAssignee={vi.fn()}
        onToggleOpen={vi.fn()}
        sellerMembers={mockMembers}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Buscar responsável...");
    fireEvent.change(searchInput, { target: { value: "Maria" } });

    expect(
      screen.getByRole("button", { name: "Maria Santos" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "João Silva" }),
    ).not.toBeInTheDocument();
  });

  it("displays loading indicator when isLoadingMembers is true", () => {
    render(
      <CrmResponsibleFilterDropdown
        isLoadingMembers={true}
        isOpen={true}
        onClose={vi.fn()}
        onSelectAssignee={vi.fn()}
        onToggleOpen={vi.fn()}
        sellerMembers={[]}
      />,
    );

    expect(screen.getByText("Carregando membros...")).toBeInTheDocument();
  });

  it("displays error message and retry button when member loading fails", () => {
    const onRetry = vi.fn();
    render(
      <CrmResponsibleFilterDropdown
        isOpen={true}
        memberError={new Error("Failed")}
        onClose={vi.fn()}
        onRetryMembers={onRetry}
        onSelectAssignee={vi.fn()}
        onToggleOpen={vi.fn()}
        sellerMembers={[]}
      />,
    );

    expect(
      screen.getByText("Não foi possível carregar os membros."),
    ).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: "Tentar novamente" });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows active label and clear button when filter is active", () => {
    const onSelectAssignee = vi.fn();
    render(
      <CrmResponsibleFilterDropdown
        assignee="user-1"
        isOpen={false}
        onClose={vi.fn()}
        onSelectAssignee={onSelectAssignee}
        onToggleOpen={vi.fn()}
        sellerMembers={mockMembers}
      />,
    );

    expect(screen.getByText("João Silva")).toBeInTheDocument();
    const clearBtn = screen.getByLabelText("Limpar filtro de responsável");
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onSelectAssignee).toHaveBeenCalledWith(undefined);
  });
});
