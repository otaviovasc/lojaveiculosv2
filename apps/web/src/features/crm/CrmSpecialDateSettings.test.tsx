// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import { CrmSpecialDateSettings } from "./CrmSpecialDateSettings";
import type { CrmSpecialDateApi } from "./crmSpecialDateApi";
import {
  CRM_SPECIAL_DATE_TYPES,
  type CrmSpecialDateConfig,
  type CrmSpecialDateType,
  type UpdateCrmSpecialDateConfigInput,
} from "./crmSpecialDateTypes";

describe("CrmSpecialDateSettings", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads every server-owned special date with BRT defaults", async () => {
    const api = createApi();

    render(
      <CrmSpecialDateSettings
        api={api}
        canManage
        connectionId="connection-1"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Aniversário do cliente" }),
    ).toBeVisible();
    const getConfigs = vi.mocked(api.getConfigs);
    const firstCall = getConfigs.mock.calls.at(0);
    expect(firstCall?.[0]).toBe("connection-1");
    expect(firstCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(screen.getAllByRole("article")).toHaveLength(7);
    expect(screen.getAllByDisplayValue("09:00")).toHaveLength(7);
    expect(screen.getAllByText("Desativada")).toHaveLength(7);
  });

  it("saves an enabled date with its lead window, BRT time and template", async () => {
    const api = createApi();
    render(
      <CrmSpecialDateSettings
        api={api}
        canManage
        connectionId="connection-1"
      />,
    );

    await screen.findByRole("heading", { name: "Aniversário do cliente" });
    fireEvent.click(
      screen.getByRole("switch", { name: "Ativar Aniversário do cliente" }),
    );
    fireEvent.change(
      screen.getByLabelText("Antecedência para Aniversário do cliente"),
      {
        target: { value: "3" },
      },
    );
    fireEvent.change(
      screen.getByLabelText("Horário (BRT) para Aniversário do cliente"),
      {
        target: { value: "10:30" },
      },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Salvar configuração" })[0]!,
    );

    await waitFor(() =>
      expect(api.updateConfig).toHaveBeenCalledWith(
        "connection-1",
        "birthday",
        expect.objectContaining({
          enabled: true,
          leadDays: 3,
          messageTemplate: "Mensagem birthday para {nome}.",
          sendTime: "10:30",
        }),
      ),
    );
    expect(
      await screen.findByText("Configuração de aniversário do cliente salva."),
    ).toBeVisible();
  });

  it("marks drafts and locks every editor while one date is saving", async () => {
    let resolveUpdate: (value: { config: CrmSpecialDateConfig }) => void = () =>
      undefined;
    const configs = makeConfigs("connection-1");
    const api = createApi(configs);
    api.updateConfig = vi.fn(
      () =>
        new Promise<{ config: CrmSpecialDateConfig }>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    render(
      <CrmSpecialDateSettings
        api={api}
        canManage
        connectionId="connection-1"
      />,
    );

    await screen.findByRole("heading", { name: "Aniversário do cliente" });
    fireEvent.click(
      screen.getByRole("switch", { name: "Ativar Aniversário do cliente" }),
    );
    expect(screen.getByText("Alterações não salvas")).toBeVisible();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Salvar configuração" })[0]!,
    );

    expect(
      screen
        .getAllByRole("switch")
        .every((control) => control.hasAttribute("disabled")),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("button", { name: "Salvar configuração" })
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);

    resolveUpdate({ config: { ...configs[0]!, enabled: true } });
    expect(
      await screen.findByText("Configuração de aniversário do cliente salva."),
    ).toBeVisible();
    expect(screen.queryByText("Alterações não salvas")).not.toBeInTheDocument();
  });

  it("sends disabled state so pending messages can be cancelled by the server", async () => {
    const birthday = makeConfig("connection-1", {
      dateType: "birthday",
      enabled: true,
    });
    const api = createApi([birthday, ...makeConfigs("connection-1").slice(1)]);
    render(
      <CrmSpecialDateSettings
        api={api}
        canManage
        connectionId="connection-1"
      />,
    );

    await screen.findByRole("heading", { name: "Aniversário do cliente" });
    fireEvent.click(
      screen.getByRole("switch", { name: "Ativar Aniversário do cliente" }),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Salvar configuração" })[0]!,
    );

    await waitFor(() =>
      expect(api.updateConfig).toHaveBeenCalledWith(
        "connection-1",
        "birthday",
        expect.objectContaining({ enabled: false }),
      ),
    );
    expect(
      screen.getByText(/envios pendentes desse tipo são cancelados/i),
    ).toBeVisible();
  });

  it("explains how to fix an unavailable scheduling route", async () => {
    const api = createApi();
    api.updateConfig = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_ROUTING_POLICY_BLOCKED",
        message: "The configured scheduled-message route is unavailable.",
        status: 422,
      });
    });
    render(
      <CrmSpecialDateSettings
        api={api}
        canManage
        connectionId="connection-1"
      />,
    );

    await screen.findByRole("heading", { name: "Aniversário do cliente" });
    fireEvent.click(
      screen.getByRole("switch", { name: "Ativar Aniversário do cliente" }),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Salvar configuração" })[0]!,
    );

    expect(
      await screen.findByText(
        /rota de agendamento desta conexão está indisponível/i,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(/roteamento padrão do CRM antes de ativar/i),
    ).toBeVisible();
  });

  it("shows a retryable loading error and never renders stale settings", async () => {
    const api = createApi();
    api.getConfigs = vi.fn(async () => {
      throw new Error("network down");
    });

    render(
      <CrmSpecialDateSettings
        api={api}
        canManage
        connectionId="connection-1"
      />,
    );

    expect(await screen.findByText("Não foi possível carregar")).toBeVisible();
    expect(screen.getByText("network down")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Salvar configuração" }),
    ).not.toBeInTheDocument();
  });

  it("drops the previous scope draft when connection changes during a request", async () => {
    let resolveFirst: (value: {
      configs: CrmSpecialDateConfig[];
    }) => void = () => undefined;
    let resolveSecond: (value: {
      configs: CrmSpecialDateConfig[];
    }) => void = () => undefined;
    const api = createApi();
    api.getConfigs = vi.fn(
      (connectionId: string) =>
        new Promise<{ configs: CrmSpecialDateConfig[] }>((resolve) => {
          if (connectionId === "connection-1") resolveFirst = resolve;
          else resolveSecond = resolve;
        }),
    );
    const { rerender } = render(
      <CrmSpecialDateSettings
        api={api}
        canManage
        connectionId="connection-1"
      />,
    );

    rerender(
      <CrmSpecialDateSettings
        api={api}
        canManage
        connectionId="connection-2"
      />,
    );
    resolveFirst({
      configs: makeConfigs("connection-1", "old scope"),
    });
    await Promise.resolve();
    expect(screen.queryByDisplayValue("old scope")).not.toBeInTheDocument();

    resolveSecond({
      configs: makeConfigs("connection-2", "current scope"),
    });
    expect(await screen.findAllByDisplayValue("current scope")).toHaveLength(7);
    expect(screen.queryByDisplayValue("old scope")).not.toBeInTheDocument();
  });
});

function createApi(configs = makeConfigs("connection-1")): CrmSpecialDateApi {
  return {
    getConfigs: vi.fn(async () => ({ configs })),
    updateConfig: vi.fn(
      async (
        connectionId: string,
        dateType: CrmSpecialDateType,
        input: UpdateCrmSpecialDateConfigInput,
      ) => ({
        config: {
          ...configs.find((config) => config.dateType === dateType)!,
          connectionId,
          dateType,
          ...input,
        },
      }),
    ),
  };
}

function makeConfigs(connectionId: string, templatePrefix?: string) {
  return CRM_SPECIAL_DATE_TYPES.map((dateType) =>
    makeConfig(connectionId, {
      dateType,
      ...(templatePrefix ? { messageTemplate: templatePrefix } : {}),
    }),
  );
}

function makeConfig(
  connectionId: string,
  overrides: Partial<CrmSpecialDateConfig>,
): CrmSpecialDateConfig {
  return {
    connectionId,
    dateType: "birthday",
    enabled: false,
    leadDays: 0,
    messageTemplate: "Mensagem birthday para {nome}.",
    sendTime: "09:00",
    ...overrides,
  };
}
