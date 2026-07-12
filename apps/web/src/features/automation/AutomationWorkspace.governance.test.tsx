// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AutomationApi } from "./apiClient";
import { automationRun, automationSummary } from "./automationTestFixtures";
import { AutomationWorkspace } from "./AutomationWorkspace";

vi.mock("../../components/ui/AnimatedContent", () => ({
  default: ({
    children,
    ...props
  }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) => (
    <div {...props}>{children}</div>
  ),
}));

afterEach(cleanup);

describe("AutomationWorkspace governance", () => {
  it("shows mutation controls only for their exact permissions", async () => {
    const run = automationRun();
    const api = staticApi(run);
    const user = userEvent.setup();

    render(
      <AutomationWorkspace
        api={api}
        grantedPermissions={["automation.run", "automation.cancel"]}
      />,
    );

    await screen.findByText(run.objective);
    expect(
      screen.getByRole("button", { name: "Nova automação" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("button", { name: "Cancelar prévia" }),
    ).toBeVisible();

    await user.click(screen.getByRole("tab", { name: /Validar/ }));
    expect(
      screen.queryByRole("button", { name: "Aprovar plano" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Rejeitar plano" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/não registrar a decisão/)).toBeVisible();
  });

  it("uses server total and exposes truthful incremental loading", async () => {
    const first = automationRun();
    const second = automationRun({
      id: "run_2",
      objective: "Conferir documentos pendentes",
    });
    const listRuns = vi.fn<AutomationApi["listRuns"]>(async (input = {}) => {
      const offset = input.offset ?? 0;
      return {
        data: [automationSummary(offset === 0 ? first : second)],
        meta: { limit: 40, offset, total: 2 },
      };
    });
    const api = { ...staticApi(first), listRuns };
    const user = userEvent.setup();

    render(<AutomationWorkspace api={api} grantedPermissions={[]} />);

    const totalLabel = await screen.findByText("Prévias no total");
    expect(
      within(totalLabel.closest(".automation-metric") as HTMLElement).getByText(
        "2",
      ),
    ).toBeVisible();
    expect(screen.getAllByText("entre 1 carregadas")).toHaveLength(3);
    expect(screen.getByText("1 de 2 carregadas")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Carregar mais prévias" }),
    );

    expect(await screen.findByText(second.objective)).toBeVisible();
    expect(listRuns).toHaveBeenLastCalledWith({ limit: 40, offset: 1 });
    expect(screen.getByText("2 de 2 carregadas")).toBeVisible();
  });
});

function staticApi(run: ReturnType<typeof automationRun>): AutomationApi {
  return {
    approveStep: vi.fn().mockResolvedValue(run),
    cancelRun: vi.fn().mockResolvedValue(run),
    createRun: vi.fn().mockResolvedValue(run),
    getRun: vi.fn().mockResolvedValue(run),
    listRuns: vi.fn().mockResolvedValue({
      data: [automationSummary(run)],
      meta: { limit: 40, offset: 0, total: 1 },
    }),
    rejectStep: vi.fn().mockResolvedValue(run),
  };
}
