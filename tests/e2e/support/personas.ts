export type QaPersonaKey = "agency" | "owner" | "salesman" | "supervisor";

export type QaPersona = {
  email: string;
  expectedPath: RegExp;
  name: string;
  role: QaPersonaKey;
  storeSlug?: string;
  userId: string;
};

export const qaPersonas = {
  agency: {
    email: "agency.seed@lojaveiculos.com.br",
    expectedPath: /\/agency\/admin$/,
    name: "Seed Agency",
    role: "agency",
    userId: "clerk_seed_agency",
  },
  owner: {
    email: "owner.seed@lojaveiculos.com.br",
    expectedPath: /\/dashboard$/,
    name: "Seed Owner",
    role: "owner",
    storeSlug: "test-store",
    userId: "clerk_seed_owner",
  },
  salesman: {
    email: "salesman.seed@lojaveiculos.com.br",
    expectedPath: /\/dashboard$/,
    name: "Seed Salesman",
    role: "salesman",
    storeSlug: "test-store",
    userId: "clerk_seed_salesman",
  },
  supervisor: {
    email: "supervisor.seed@lojaveiculos.com.br",
    expectedPath: /\/dashboard$/,
    name: "Seed Supervisor",
    role: "supervisor",
    storeSlug: "test-store",
    userId: "clerk_seed_supervisor",
  },
} satisfies Record<QaPersonaKey, QaPersona>;

export function accountHeaders(persona: QaPersona) {
  return {
    "x-clerk-user-id": persona.userId,
    "x-user-email": persona.email,
    "x-user-name": persona.name,
  };
}
