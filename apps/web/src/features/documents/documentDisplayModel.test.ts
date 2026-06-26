import { describe, expect, it } from "vitest";
import {
  documentOriginLabel,
  documentScopeLabel,
  documentVehicleInfo,
  filterDocumentsForFolder,
  filterDocumentsForWorkspace,
  summarizeWorkspaceDocuments,
} from "./documentDisplayModel";
import { filterByOrigin, sortByCreatedDesc } from "./documentWorkspaceFilters";
import type { WorkspaceDocument } from "./types";

describe("document display model", () => {
  it("distinguishes automatic documents from manual uploads", () => {
    const automatic = createDocument({ id: "auto" });
    const manual = createDocument({
      id: "manual",
      metadata: { manualUpload: true },
    });

    expect(documentOriginLabel(automatic)).toBe("Automático");
    expect(documentOriginLabel(manual)).toBe("Envio manual");
    expect(summarizeWorkspaceDocuments([automatic, manual])).toMatchObject({
      automatic: 1,
      manual: 1,
      total: 2,
    });
  });

  it("labels unit-linked and Geral documents", () => {
    const vehicleDocument = createDocument({
      id: "vehicle",
      metadata: {
        vehicle: {
          listingId: "listing_1",
          plate: "ABC1D23",
          title: "Fiat Toro Volcano",
          unitId: "unit_1",
          vin: "9BWZZZ",
        },
      },
      targetId: "unit_1",
      targetType: "vehicle_unit",
    });
    const generalDocument = createDocument({ id: "general" });

    expect(documentScopeLabel(vehicleDocument)).toBe("Unidade");
    expect(documentVehicleInfo(vehicleDocument)).toMatchObject({
      label: "Fiat Toro Volcano",
      plate: "ABC1D23",
    });
    expect(documentScopeLabel(generalDocument)).toBe("Geral");
    expect(documentVehicleInfo(generalDocument)).toBeNull();
  });

  it("filters by origin, scope, vehicle, and searchable vehicle data", () => {
    const vehicleDocument = createDocument({
      id: "vehicle",
      metadata: {
        manualUpload: true,
        vehicle: {
          listingId: "listing_1",
          plate: "ABC1D23",
          title: "Fiat Toro Volcano",
          unitId: "unit_1",
          vin: "9BWZZZ",
        },
      },
      targetId: "unit_1",
      targetType: "vehicle_unit",
    });
    const automaticGeneral = createDocument({ id: "general" });

    expect(
      filterDocumentsForWorkspace([vehicleDocument, automaticGeneral], {
        dateFrom: "",
        dateTo: "",
        kind: "",
        origin: "manual",
        scope: "vehicle",
        search: "abc1d23",
        status: "",
        vehicleId: "unit_1",
      }),
    ).toEqual([vehicleDocument]);
  });

  it("filters by uploaded date range without leaking neighboring days", () => {
    const before = createDocument({
      id: "before",
      uploadedAt: "2026-06-01T02:59:59.000Z",
    });
    const inside = createDocument({
      id: "inside",
      uploadedAt: "2026-06-01T12:00:00.000Z",
    });
    const after = createDocument({
      id: "after",
      uploadedAt: "2026-06-02T03:00:00.000Z",
    });

    expect(
      filterDocumentsForWorkspace([before, inside, after], {
        dateFrom: "2026-06-01",
        dateTo: "2026-06-01",
        kind: "",
        origin: "all",
        scope: "all",
        search: "",
        status: "",
        vehicleId: "",
      }),
    ).toEqual([inside]);
  });

  it("ignores malformed date filter values", () => {
    const document = createDocument({ id: "document" });

    expect(
      filterDocumentsForWorkspace([document], {
        dateFrom: "2026-06",
        dateTo: "2026-02-31",
        kind: "",
        origin: "all",
        scope: "all",
        search: "",
        status: "",
        vehicleId: "",
      }),
    ).toEqual([document]);
  });

  it("groups unit-target documents by vehicle unit metadata", () => {
    const vehicleDocument = createDocument({
      id: "vehicle",
      metadata: {
        vehicle: {
          listingId: "listing_1",
          title: "Fiat Toro Volcano",
          unitId: "unit_1",
        },
      },
      targetId: "unit_1",
      targetType: "vehicle_unit",
    });
    const generalDocument = createDocument({ id: "general" });

    expect(filterDocumentsForFolder([vehicleDocument], "unit:unit_1")).toEqual([
      vehicleDocument,
    ]);
    expect(
      filterDocumentsForFolder([vehicleDocument, generalDocument], "general"),
    ).toEqual([generalDocument]);
  });

  it("filters by origin keeping automatic and manual separable", () => {
    const automatic = createDocument({ id: "auto" });
    const manual = createDocument({
      id: "manual",
      metadata: { manualUpload: true },
    });

    expect(filterByOrigin([automatic, manual], "all")).toEqual([
      automatic,
      manual,
    ]);
    expect(filterByOrigin([automatic, manual], "automatic")).toEqual([
      automatic,
    ]);
    expect(filterByOrigin([automatic, manual], "manual")).toEqual([manual]);
  });

  it("sorts by createdAt descending without mutating the input", () => {
    const newest = createDocument({
      id: "newest",
      createdAt: "2026-06-10T09:00:00.000Z",
    });
    const middle = createDocument({
      id: "middle",
      createdAt: "2026-06-05T09:00:00.000Z",
    });
    const oldest = createDocument({
      id: "oldest",
      createdAt: "2026-06-01T09:00:00.000Z",
    });
    const input = [middle, oldest, newest];

    const sorted = sortByCreatedDesc(input);

    expect(sorted).toEqual([newest, middle, oldest]);
    expect(input).toEqual([middle, oldest, newest]);
  });
});

function createDocument(
  overrides: Partial<WorkspaceDocument> & {
    id: string;
    targetId?: string;
    targetType?: WorkspaceDocument["context"]["targetType"];
  },
): WorkspaceDocument {
  const { id, targetId, targetType, ...documentOverrides } = overrides;
  return {
    context: {
      linkRole: documentOverrides.context?.linkRole ?? "primary",
      targetId: documentOverrides.context?.targetId ?? targetId ?? "store_1",
      targetType:
        documentOverrides.context?.targetType ?? targetType ?? "store",
    },
    createdAt: documentOverrides.createdAt ?? "2026-06-01T09:00:00.000Z",
    file: documentOverrides.file ?? {
      fileName: `${id}.pdf`,
      fileSizeBytes: 1024,
      mimeType: "application/pdf",
    },
    id,
    kind: documentOverrides.kind ?? "other",
    metadata: overrides.metadata ?? {},
    status: documentOverrides.status ?? "issued",
    title: documentOverrides.title ?? "Documento",
    updatedAt: documentOverrides.updatedAt ?? "2026-06-01T09:00:00.000Z",
    uploadedAt: documentOverrides.uploadedAt ?? "2026-06-01T09:00:00.000Z",
  };
}
