// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmPipelineToolbar } from "./CrmPipelineToolbar";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { Pipeline, PipelineStage } from "./crmPipelineStorage";

describe("CrmPipelineToolbar", () => {
  afterEach(cleanup);

  const stages: PipelineStage[] = [
    {
      id: "new",
      name: "Novos",
      color: "var(--color-primary)",
      isSystem: true,
      leadStatus: "new",
      slaDays: 1,
      status: "open",
    },
    {
      id: "negotiating",
      name: "Em Negociação",
      color: "var(--color-warning)",
      isSystem: false,
      leadStatus: "negotiating",
      slaDays: 3,
      status: "open",
    },
  ];

  const pipelines: Pipeline[] = [
    {
      id: "vendas",
      name: "Vendas",
      description: "Pipeline de vendas",
      isDefault: true,
      stages,
      rotationActive: false,
    },
  ];

  const vehicleOptions: LeadVehicleOption[] = [
    {
      id: "v1",
      label: "Toyota Corolla 2023",
      detail: "Flex",
      priceCents: 12000000,
    },
    {
      id: "v2",
      label: "Honda Civic 2022",
      detail: "Gasolina",
      priceCents: 11000000,
    },
  ];

  const defaultProps = {
    activePipelineId: "vendas",
    customFilters: {
      origem: [],
      resposta: [],
      responsavel: undefined,
      semInteracao: "",
      veiculoId: undefined,
    },
    filters: { search: "", source: "all" as const, status: "all" as const },
    onChangeCustomFilters: vi.fn(),
    onChangeFilters: vi.fn(),
    onChangeViewMode: vi.fn(),
    onConfigureClick: vi.fn(),
    onCreateClick: vi.fn(),
    onCreatePipeline: vi.fn(),
    onExportCsv: vi.fn(),
    onSelectPipeline: vi.fn(),
    onToggleStageVisibility: vi.fn(),
    pipelines,
    stages,
    vehicleOptions,
    viewMode: "kanban" as const,
    visibleStages: {},
  };

  it("renders export CSV button and calls onExportCsv when clicked", () => {
    const onExportCsv = vi.fn();
    render(<CrmPipelineToolbar {...defaultProps} onExportCsv={onExportCsv} />);

    const exportBtn = screen.getByTitle("Exportar leads filtrados para CSV");
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);
    expect(onExportCsv).toHaveBeenCalledTimes(1);
  });

  it("renders vehicle inventory dropdown and selects vehicle filter", () => {
    const onChangeCustomFilters = vi.fn();
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        onChangeCustomFilters={onChangeCustomFilters}
      />,
    );

    const vehicleBtn = screen.getByText("Veículo");
    expect(vehicleBtn).toBeInTheDocument();

    fireEvent.click(vehicleBtn);
    expect(
      screen.getByPlaceholderText("Buscar veículo do estoque..."),
    ).toBeInTheDocument();

    const corollaOption = screen.getByText("Toyota Corolla 2023");
    fireEvent.click(corollaOption);

    expect(onChangeCustomFilters).toHaveBeenCalledWith(
      expect.objectContaining({ veiculoId: "v1" }),
    );
  });

  it("displays active vehicle filter and allows clearing it", () => {
    const onChangeCustomFilters = vi.fn();
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        customFilters={{ ...defaultProps.customFilters, veiculoId: "v1" }}
        onChangeCustomFilters={onChangeCustomFilters}
      />,
    );

    expect(screen.getByText("Toyota Corolla 2023")).toBeInTheDocument();
    const clearBtn = screen.getByLabelText("Limpar filtro de veículo");
    fireEvent.click(clearBtn);

    expect(onChangeCustomFilters).toHaveBeenCalledWith(
      expect.objectContaining({ veiculoId: undefined }),
    );
  });

  it("renders human attendance dropdown and toggles waiting_human filter", () => {
    const onChangeFilters = vi.fn();
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        onChangeFilters={onChangeFilters}
      />,
    );

    const btn = screen.getByRole("button", { name: "Atendimento humano" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);

    const waitingOption = screen.getByText("Aguardando humano");
    fireEvent.click(waitingOption);

    expect(onChangeFilters).toHaveBeenCalledWith(
      expect.objectContaining({ humanAttendanceState: "waiting_human" }),
    );
  });

  it("displays active human attendance filter and allows clearing it", () => {
    const onChangeFilters = vi.fn();
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        filters={{
          ...defaultProps.filters,
          humanAttendanceState: "waiting_human",
        }}
        onChangeFilters={onChangeFilters}
      />,
    );

    const clearBtn = screen.getByLabelText("Limpar filtro de atendimento");
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    expect(onChangeFilters).toHaveBeenCalledWith(
      expect.objectContaining({ humanAttendanceState: "all" }),
    );
  });

  it("renders sortBy control and changes sort to next_task", () => {
    const onChangeFilters = vi.fn();
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        onChangeFilters={onChangeFilters}
      />,
    );

    const sortBtn = screen.getByRole("button", { name: "Ordenar" });
    expect(sortBtn).toBeInTheDocument();
    fireEvent.click(sortBtn);

    const nextTaskOption = screen.getByText("Próxima tarefa");
    fireEvent.click(nextTaskOption);

    expect(onChangeFilters).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: "next_task" }),
    );
  });

  it("renders import CSV button when canImportLeads is true and calls onImportClick", () => {
    const onImportClick = vi.fn();
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        canImportLeads={true}
        onImportClick={onImportClick}
      />,
    );

    const importBtn = screen.getByRole("button", {
      name: "Importar leads em CSV",
    });
    expect(importBtn).toBeInTheDocument();
    fireEvent.click(importBtn);

    expect(onImportClick).toHaveBeenCalledTimes(1);
  });

  it("does not render import CSV button when canImportLeads is false", () => {
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        canImportLeads={false}
        onImportClick={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Importar leads em CSV" }),
    ).not.toBeInTheDocument();
  });

  it("renders Origem dropdown with all supported sources including Instagram and toggles multi-select", () => {
    const onChangeCustomFilters = vi.fn();
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        onChangeCustomFilters={onChangeCustomFilters}
      />,
    );

    const origemBtn = screen.getByRole("button", { name: "Origem" });
    expect(origemBtn).toBeInTheDocument();
    fireEvent.click(origemBtn);

    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("OLX")).toBeInTheDocument();

    const instagramCheckbox = screen.getByRole("checkbox", {
      name: "Instagram",
    });
    fireEvent.click(instagramCheckbox);

    expect(onChangeCustomFilters).toHaveBeenCalledWith(
      expect.objectContaining({ origem: ["instagram"] }),
    );
  });

  it("renders responsible dropdown with static options and store members", () => {
    const onChangeCustomFilters = vi.fn();
    const sellerMembers = [
      {
        email: "vendedor@loja.com",
        id: "user-123",
        name: "Carlos Vendedor",
        role: "salesman",
      },
    ];

    render(
      <CrmPipelineToolbar
        {...defaultProps}
        hasUserContext={true}
        onChangeCustomFilters={onChangeCustomFilters}
        sellerMembers={sellerMembers}
      />,
    );

    const respBtn = screen.getByRole("button", {
      name: "Filtrar por responsável",
    });
    expect(respBtn).toBeInTheDocument();
    fireEvent.click(respBtn);

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
      screen.getByRole("button", { name: "Carlos Vendedor" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Carlos Vendedor" }));
    expect(onChangeCustomFilters).toHaveBeenCalledWith(
      expect.objectContaining({ responsavel: "user-123" }),
    );
  });

  it("hides Meus leads when hasUserContext is false", () => {
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        hasUserContext={false}
        sellerMembers={[]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Filtrar por responsável" }),
    );
    expect(
      screen.queryByRole("button", { name: "Meus leads" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
  });

  it("displays active responsible filter and allows clearing it", () => {
    const onChangeCustomFilters = vi.fn();
    render(
      <CrmPipelineToolbar
        {...defaultProps}
        customFilters={{ ...defaultProps.customFilters, responsavel: "me" }}
        onChangeCustomFilters={onChangeCustomFilters}
      />,
    );

    expect(screen.getByText("Meus leads")).toBeInTheDocument();
    const clearBtn = screen.getByLabelText("Limpar filtro de responsável");
    fireEvent.click(clearBtn);

    expect(onChangeCustomFilters).toHaveBeenCalledWith(
      expect.objectContaining({ responsavel: undefined }),
    );
  });
});
