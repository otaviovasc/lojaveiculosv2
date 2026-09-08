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
      responsavel: [],
      semInteracao: "",
      fonte: [],
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
});
