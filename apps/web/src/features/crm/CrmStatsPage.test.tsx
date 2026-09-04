// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmStatsPage } from "./CrmStatsPage";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmProviderConnection } from "./crmConversationTypes";
import type { CrmStatisticsResponse } from "./crmStatisticsTypes";

const connection = {
  channel: "whatsapp",
  displayName: "WhatsApp principal",
  id: "11111111-1111-4111-8111-111111111111",
  provider: "zapi",
  state: "active",
} as CrmProviderConnection;

const statistics: CrmStatisticsResponse = {
  agents: [
    {
      active: true,
      agentId: "agent-1",
      averageFirstResponseMs: 120000,
      email: "ana@example.test",
      handledConversations: 7,
      humanOutboundMessages: 21,
      name: "Ana",
      openAssignments: 3,
      role: "Vendedora",
    },
  ],
  attribution: "current_assignee",
  byChannel: [{ count: 8, key: "whatsapp", label: "WhatsApp" }],
  bySource: [{ count: 5, key: "olx", label: "OLX" }],
  connection: null,
  daily: [
    {
      conversationsCreated: 8,
      date: "2026-08-21",
      externalAiOutboundMessages: 1,
      humanOutboundMessages: 21,
      inboundMessages: 25,
      internalAutomationOutboundMessages: 1,
      otherOutboundMessages: 0,
    },
  ],
  messages: {
    externalAiOutbound: 1,
    humanOutbound: 21,
    inbound: 25,
    internalAutomationOutbound: 1,
    otherOutbound: 0,
    total: 48,
  },
  period: {
    from: "2026-08-01T03:00:00.000Z",
    timezone: "America/Sao_Paulo",
    toExclusive: "2026-08-23T03:00:00.000Z",
  },
  queues: {
    assigned: 3,
    completed: 4,
    fresh: 1,
    inHumanService: 2,
    unassigned: 1,
    waitingHuman: 1,
  },
  summary: {
    activeConversations: 4,
    automatedHandledConversations: 2,
    averageFirstResponseMs: 120000,
    completedConversations: 4,
    conversationsCreated: 8,
    firstResponseSamples: 7,
    humanHandledConversations: 7,
    scheduledVisits: 3,
    wonLeads: 2,
  },
};

afterEach(cleanup);

describe("CrmStatsPage", () => {
  it("renders real operational metrics and refreshes them", async () => {
    const getStatistics = vi
      .fn<CrmConversationApi["getStatistics"]>()
      .mockResolvedValue(statistics);
    render(
      <CrmStatsPage
        api={{ getStatistics }}
        canRead
        connections={[connection]}
      />,
    );

    expect(await screen.findByText("Conversas iniciadas")).toBeInTheDocument();
    const initialQuery = getStatistics.mock.calls[0]?.[0];
    expect(initialQuery?.toExclusive).toMatch(/T00:00:00-03:00$/);
    expect(
      (new Date(initialQuery!.toExclusive).getTime() -
        new Date(initialQuery!.from).getTime()) /
        86_400_000,
    ).toBe(30);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Enviadas por IA externa")).toBeInTheDocument();
    expect(screen.getByText("Automação interna/sistema")).toBeInTheDocument();
    expect(
      screen.getByText(/não há sinal canônico separado para “minibot”/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Atribuição por responsável atual da conversa; mudanças de responsável podem alterar a leitura histórica.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(getStatistics).toHaveBeenCalledTimes(2);
  });

  it("aborts and ignores a stale response after the period changes", async () => {
    const pending: Array<{
      resolve: (value: CrmStatisticsResponse) => void;
    }> = [];
    const getStatistics = vi
      .fn<CrmConversationApi["getStatistics"]>()
      .mockImplementation(
        () =>
          new Promise<CrmStatisticsResponse>((resolve) => {
            pending.push({ resolve });
          }),
      );
    render(
      <CrmStatsPage
        api={{ getStatistics }}
        canRead
        connections={[connection]}
      />,
    );
    await waitFor(() => expect(getStatistics).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "Período" }));
    await userEvent.click(
      screen.getByRole("option", { name: "Últimos 7 dias" }),
    );
    await waitFor(() => expect(getStatistics).toHaveBeenCalledTimes(2));
    expect(getStatistics.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);

    await act(async () => {
      pending[1]!.resolve({
        ...statistics,
        summary: { ...statistics.summary, conversationsCreated: 22 },
      });
    });
    const conversationCard = screen
      .getByText("Conversas iniciadas")
      .closest("article")!;
    expect(within(conversationCard).getByText("22")).toBeInTheDocument();

    await act(async () => {
      pending[0]!.resolve({
        ...statistics,
        summary: { ...statistics.summary, conversationsCreated: 99 },
      });
    });
    expect(screen.queryByText("99")).not.toBeInTheDocument();
    expect(within(conversationCard).getByText("22")).toBeInTheDocument();
  });

  it("shows permission and connection empty states without requesting data", () => {
    const getStatistics = vi.fn(async () => statistics);
    const { rerender } = render(
      <CrmStatsPage
        api={{ getStatistics }}
        canRead={false}
        connections={[connection]}
      />,
    );
    expect(screen.getByText(/não tem permissão/i)).toBeInTheDocument();
    rerender(<CrmStatsPage api={{ getStatistics }} canRead connections={[]} />);
    expect(screen.getByText(/Conecte um canal/i)).toBeInTheDocument();
    expect(getStatistics).not.toHaveBeenCalled();
  });
});
