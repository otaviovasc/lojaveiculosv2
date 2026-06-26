import { describe, expect, it } from "vitest";
import {
  buildDocumentTopLevelGroups,
  createFolderKey,
  documentPrimaryParty,
  filterDocumentsByGroup,
} from "./documentsWorkspaceModel";
import type { WorkspaceDocument } from "./types";

describe("documents workspace model", () => {
  it("groups documents into exactly 2 top-level groups (geral + unidades)", () => {
    const documents = [
      createDocument({
        id: "doc_1",
        kind: "sale_contract",
        metadata: { plate: "ABC1D23" },
        targetId: "unit_1",
        targetType: "vehicle_unit",
        uploadedAt: "2026-06-01T10:00:00.000Z",
      }),
      createDocument({
        id: "doc_2",
        kind: "sale_receipt",
        targetId: "unit_2",
        targetType: "vehicle_unit",
        uploadedAt: "2026-06-02T10:00:00.000Z",
      }),
      createDocument({
        id: "doc_3",
        kind: "invoice",
        targetId: "store_1",
        targetType: "store",
      }),
      createDocument({
        id: "doc_4",
        kind: "other",
        targetId: "lead_1",
        targetType: "lead",
      }),
    ];

    const groups = buildDocumentTopLevelGroups(documents);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      count: 2,
      key: "geral",
      latestAt: "2026-06-01T09:00:00.000Z",
      title: "Documentos gerais",
    });
    expect(groups[1]).toMatchObject({
      count: 2,
      key: "veiculos",
      latestAt: "2026-06-02T10:00:00.000Z",
      title: "Unidades",
    });
  });

  it("returns both groups when documents list is empty", () => {
    const groups = buildDocumentTopLevelGroups([]);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.key)).toEqual(["geral", "veiculos"]);
  });

  it("counts issued and pendingSignature documents per group", () => {
    const documents = [
      createDocument({
        id: "doc_issued",
        status: "issued",
        targetId: "unit_1",
        targetType: "vehicle_unit",
      }),
      createDocument({
        id: "doc_signed",
        status: "pending_signature",
        targetId: "unit_2",
        targetType: "vehicle_unit",
      }),
    ];

    const groups = buildDocumentTopLevelGroups(documents);
    const vehicles = groups.find((group) => group.key === "veiculos");
    expect(vehicles?.issued).toBe(1);
    expect(vehicles?.pendingSignature).toBe(1);
  });

  it("filters documents by selected group key (geral excludes unit-linked)", () => {
    const vehicleDocument = createDocument({
      id: "doc_vehicle",
      targetId: "unit_1",
      targetType: "vehicle_unit",
    });
    const storeDocument = createDocument({
      id: "doc_store",
      targetId: "store_1",
      targetType: "store",
    });
    const leadDocument = createDocument({
      id: "doc_lead",
      targetId: "lead_1",
      targetType: "lead",
    });

    expect(createFolderKey(vehicleDocument)).toBe("vehicle_unit:unit_1");
    expect(
      filterDocumentsByGroup(
        [vehicleDocument, storeDocument, leadDocument],
        "geral",
      ),
    ).toEqual([storeDocument, leadDocument]);
    expect(
      filterDocumentsByGroup(
        [vehicleDocument, storeDocument, leadDocument],
        "veiculos",
      ),
    ).toEqual([vehicleDocument]);
    expect(
      filterDocumentsByGroup(
        [vehicleDocument, storeDocument, leadDocument],
        null,
      ),
    ).toEqual([vehicleDocument, storeDocument, leadDocument]);
    expect(documentPrimaryParty(storeDocument)).toBe("Sem cliente informado");
  });
});

function createDocument(
  overrides: Partial<WorkspaceDocument> & {
    id: string;
    targetId: string;
    targetType: WorkspaceDocument["context"]["targetType"];
  },
): WorkspaceDocument {
  return {
    context: {
      linkRole: "primary",
      targetId: overrides.targetId,
      targetType: overrides.targetType,
    },
    createdAt: "2026-06-01T09:00:00.000Z",
    file: {
      fileName: `${overrides.id}.pdf`,
      fileSizeBytes: 1024,
      mimeType: "application/pdf",
    },
    id: overrides.id,
    kind: overrides.kind ?? "other",
    metadata: overrides.metadata ?? {},
    status: overrides.status ?? "issued",
    title: overrides.title ?? "Documento",
    updatedAt: "2026-06-01T09:00:00.000Z",
    uploadedAt: overrides.uploadedAt ?? "2026-06-01T09:00:00.000Z",
  };
}
