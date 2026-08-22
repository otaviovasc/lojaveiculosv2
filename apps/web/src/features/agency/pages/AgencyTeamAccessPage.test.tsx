// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../../lib/apiErrors";
import type { SessionBootstrap } from "../../account/apiClient";
import { AccountSessionProvider } from "../../account/accountSession";
import type {
  IdentityInvitationView,
  InviteStoreMemberInput,
  RoleManagementView,
  RoleMemberView,
} from "../../settings/types";
import type {
  AgencyTeamAccessApi,
  AgencyTeamAccessDirectory,
} from "../teamAccessApiClient";
import { AgencyTeamAccessPage } from "./AgencyTeamAccessPage";

describe("AgencyTeamAccessPage", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("loads directory and initial store access, synchronizing route parameters", async () => {
    const api = createMockApi();
    render(
      <AccountSessionProvider session={singleAgencySession()}>
        <MemoryRouter
          initialEntries={["/agency/admin/team-access?storeId=store_north"]}
        >
          <AgencyTeamAccessPage api={api} />
          <LocationProbe />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    await waitFor(() =>
      expect(api.getDirectory).toHaveBeenCalledWith("tenant_agency"),
    );
    await waitFor(() =>
      expect(api.getStoreAccess).toHaveBeenCalledWith(
        "tenant_agency",
        "store_north",
      ),
    );

    expect(
      await screen.findByRole("heading", { name: "Acessos de equipe" }),
    ).toBeInTheDocument();
    expect(
      (await screen.findAllByText("Gerente Norte")).length,
    ).toBeGreaterThan(0);

    // Switch store
    fireEvent.click(screen.getByRole("button", { name: "Loja selecionada" }));
    fireEvent.click(screen.getByRole("option", { name: "Loja Centro" }));

    await waitFor(() =>
      expect(api.getStoreAccess).toHaveBeenCalledWith(
        "tenant_agency",
        "store_center",
      ),
    );
    expect(screen.getByTestId("location")).toHaveTextContent(
      "?storeId=store_center",
    );
  });

  it("ignores stale response from a prior agency tenant after switching", async () => {
    const api = createMockApi();
    const centerDeferred = deferred<AgencyTeamAccessDirectory>();
    const northDeferred = deferred<AgencyTeamAccessDirectory>();

    vi.mocked(api.getDirectory).mockImplementation((tenantId) =>
      tenantId === "tenant_center"
        ? centerDeferred.promise
        : northDeferred.promise,
    );

    render(
      <AccountSessionProvider session={multiAgencySession()}>
        <MemoryRouter initialEntries={["/agency/admin/team-access"]}>
          <AgencyTeamAccessPage api={api} />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    await waitFor(() =>
      expect(api.getDirectory).toHaveBeenCalledWith("tenant_center"),
    );

    // Switch tenant to North
    fireEvent.click(
      screen.getByRole("button", { name: "Conta de agência ativa" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Agência Norte" }));

    await waitFor(() =>
      expect(api.getDirectory).toHaveBeenCalledWith("tenant_north"),
    );

    // Resolve North first
    await act(async () => {
      northDeferred.resolve({
        stores: [
          {
            storeId: "store_north",
            storeName: "Loja Norte",
            storeSlug: "loja-norte",
          },
        ],
        tenantId: "tenant_north",
      });
    });

    expect(await screen.findByText("Loja Norte")).toBeInTheDocument();

    // Resolve Center late - should be ignored
    await act(async () => {
      centerDeferred.resolve({
        stores: [
          {
            storeId: "store_center",
            storeName: "Loja Centro",
            storeSlug: "loja-centro",
          },
        ],
        tenantId: "tenant_center",
      });
    });

    expect(screen.queryByText("Loja Centro")).not.toBeInTheDocument();
  });

  it("shows error alert with request ID on failure", async () => {
    const api = createMockApi();
    vi.mocked(api.getDirectory).mockRejectedValue(
      new AppApiError({
        code: "HTTP_500",
        message: "Internal error",
        requestId: "req_team_123",
        status: 500,
        userMessage: "Falha ao carregar diretório.",
      }),
    );

    render(
      <AccountSessionProvider session={singleAgencySession()}>
        <MemoryRouter>
          <AgencyTeamAccessPage api={api} />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    expect(
      await screen.findByText(
        "Falha ao carregar diretório. ID do erro: req_team_123",
      ),
    ).toBeInTheDocument();
  });

  it("renders empty state when user has no agency tenant", async () => {
    render(
      <AccountSessionProvider session={noAgencySession()}>
        <MemoryRouter>
          <AgencyTeamAccessPage />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    expect(
      await screen.findByText("Acesso de agência necessário"),
    ).toBeInTheDocument();
  });

  it("renders empty state when agency has no linked stores", async () => {
    const api = createMockApi();
    vi.mocked(api.getDirectory).mockResolvedValue({
      stores: [],
      tenantId: "tenant_agency",
    });

    render(
      <AccountSessionProvider session={singleAgencySession()}>
        <MemoryRouter>
          <AgencyTeamAccessPage api={api} />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    expect(
      await screen.findByText("Nenhuma loja vinculada"),
    ).toBeInTheDocument();
  });

  it("supports safe member invitations through the API seam", async () => {
    const api = createMockApi();
    render(
      <AccountSessionProvider session={singleAgencySession()}>
        <MemoryRouter
          initialEntries={["/agency/admin/team-access?storeId=store_north"]}
        >
          <AgencyTeamAccessPage api={api} />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    await waitFor(() =>
      expect(api.getDirectory).toHaveBeenCalledWith("tenant_agency"),
    );
    await waitFor(() =>
      expect(api.getStoreAccess).toHaveBeenCalledWith(
        "tenant_agency",
        "store_north",
      ),
    );

    expect(
      (await screen.findAllByText("Gerente Norte")).length,
    ).toBeGreaterThan(0);

    // Invite member flow
    fireEvent.click(
      screen.getByRole("button", { name: "Convidar Novo Membro" }),
    );
    expect(screen.getByText("Convidar novo membro")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("exemplo@email.com"), {
      target: { value: "vendedor@lojanorte.com.br" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex: João da Silva"), {
      target: { value: "Carlos Vendedor" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));

    await waitFor(() =>
      expect(api.inviteStoreMember).toHaveBeenCalledWith(
        "tenant_agency",
        "store_north",
        {
          email: "vendedor@lojanorte.com.br",
          name: "Carlos Vendedor",
          role: "salesman",
        },
      ),
    );
  });

  it("persists member permission overrides via handleSaveMemberAccess", async () => {
    const api = createMockApi();
    render(
      <AccountSessionProvider session={singleAgencySession()}>
        <MemoryRouter
          initialEntries={["/agency/admin/team-access?storeId=store_north"]}
        >
          <AgencyTeamAccessPage api={api} />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    await waitFor(() =>
      expect(api.getStoreAccess).toHaveBeenCalledWith(
        "tenant_agency",
        "store_north",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Salvar Permissões" }));

    await waitFor(() =>
      expect(api.updateMembershipAccess).toHaveBeenCalledWith(
        "tenant_agency",
        "store_north",
        "mem_north_1",
        {
          overrides: [],
          role: "supervisor",
        },
      ),
    );
  });
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function createMockApi(): AgencyTeamAccessApi {
  return {
    getDirectory: vi.fn(async () => mockDirectory()),
    getStoreAccess: vi.fn(async (_tenantId, storeId) =>
      mockStoreAccess(storeId),
    ),
    inviteStoreMember: vi.fn(
      async (
        _tenantId: string,
        _storeId: string,
        input: InviteStoreMemberInput,
      ): Promise<IdentityInvitationView> => ({
        acceptUrl: "https://auth.example.com/accept",
        email: input.email,
        emailDeliveryStatus: "requested",
        id: "inv_123",
        role: input.role,
        status: "sent",
        storeId: "store_north",
        tenantId: "tenant_agency",
      }),
    ),
    resendInvitation: vi.fn(async (): Promise<IdentityInvitationView> => ({
      acceptUrl: "https://auth.example.com/accept",
      email: "pending@example.com",
      emailDeliveryStatus: "requested",
      id: "inv_123",
      role: "salesman",
      status: "sent",
      storeId: "store_north",
      tenantId: "tenant_agency",
    })),
    updateMembershipAccess: vi.fn(async (_tenantId, storeId) =>
      mockStoreAccess(storeId),
    ),
  };
}

function mockDirectory(): AgencyTeamAccessDirectory {
  return {
    stores: [
      {
        storeId: "store_north",
        storeName: "Loja Norte",
        storeSlug: "loja-norte",
      },
      {
        storeId: "store_center",
        storeName: "Loja Centro",
        storeSlug: "loja-centro",
      },
    ],
    tenantId: "tenant_agency",
  };
}

function mockStoreAccess(storeId: string): RoleManagementView {
  const isNorth = storeId === "store_north";
  return {
    actor: {
      canManageRoles: true,
      membershipId: "mem_actor",
      role: "agency",
    },
    memberships: [
      createMember({
        membershipId: isNorth ? "mem_north_1" : "mem_center_1",
        role: "supervisor",
        user: {
          email: isNorth
            ? "gerente@lojanorte.com.br"
            : "gerente@lojacentro.com.br",
          id: isNorth ? "usr_north_1" : "usr_center_1",
          name: isNorth ? "Gerente Norte" : "Gerente Centro",
        },
      }),
    ],
    pendingInvitations: [],
    permissionGroups: [],
    roles: [
      {
        assignable: true,
        defaultPermissions: [],
        description: "Supervisor da loja",
        label: "Supervisor",
        level: 60,
        role: "supervisor",
      },
      {
        assignable: true,
        defaultPermissions: [],
        description: "Vendedor de veículos",
        label: "Vendedor",
        level: 40,
        role: "salesman",
      },
    ],
  };
}

function createMember(input: Partial<RoleMemberView> = {}): RoleMemberView {
  return {
    basePermissions: [],
    effectivePermissions: [],
    manageable: true,
    membershipId: "mem_1",
    overrides: [],
    role: "salesman",
    status: "active",
    user: {
      email: "user@example.com",
      id: "usr_1",
      name: "Usuário",
    },
    ...input,
  };
}

function singleAgencySession(): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_agency",
        tenantName: "Agência Teste",
        tenantSlug: "agencia-teste",
      },
    ],
    user: {
      clerkUserId: "clerk_agency",
      email: "agency@example.test",
      id: "user_agency",
      name: "Operador",
    },
  };
}

function multiAgencySession(): SessionBootstrap {
  return {
    ...singleAgencySession(),
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_center",
        tenantName: "Agência Centro",
        tenantSlug: "agencia-centro",
      },
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_north",
        tenantName: "Agência Norte",
        tenantSlug: "agencia-norte",
      },
    ],
  };
}

function noAgencySession(): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_user",
      email: "user@example.test",
      id: "user_1",
      name: "Usuário Comum",
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
