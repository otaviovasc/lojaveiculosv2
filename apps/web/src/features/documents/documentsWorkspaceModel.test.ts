import { describe, expect, it } from "vitest";
import {
  buildDocumentFolders,
  createFolderKey,
  documentPrimaryParty,
  filterDocumentsByFolder,
} from "./documentsWorkspaceModel";
import type { WorkspaceDocument } from "./types";

describe("documents workspace model", () => {
  it("groups folders by V2 document link target instead of document kind", () => {
    const documents = [
      createDocument({
        id: "doc_1",
        kind: "sale_contract",
        metadata: {
          buyerName: "Ana Cliente",
          plate: "ABC1D23",
          vehicleTitle: "Fiat Toro Volcano 2023",
        },
        targetId: "listing_1",
        targetType: "vehicle_listing",
        uploadedAt: "2026-06-01T10:00:00.000Z",
      }),
      createDocument({
        id: "doc_2",
        kind: "sale_receipt",
        targetId: "listing_1",
        targetType: "vehicle_listing",
        uploadedAt: "2026-06-02T10:00:00.000Z",
      }),
      createDocument({
        id: "doc_3",
        kind: "invoice",
        targetId: "store_1",
        targetType: "store",
      }),
    ];

    const folders = buildDocumentFolders(documents);

    expect(folders).toHaveLength(2);
    expect(folders[0]).toMatchObject({
      count: 2,
      key: "vehicle_listing:listing_1",
      latestAt: "2026-06-02T10:00:00.000Z",
      subtitle: "Veiculo · ABC1D23",
      title: "Fiat Toro Volcano 2023",
    });
    expect(folders[1]).toMatchObject({
      count: 1,
      key: "store:store_1",
      title: "Documentos gerais",
    });
  });

  it("filters visible documents by selected folder key", () => {
    const vehicleDocument = createDocument({
      id: "doc_vehicle",
      targetId: "listing_1",
      targetType: "vehicle_listing",
    });
    const storeDocument = createDocument({
      id: "doc_store",
      targetId: "store_1",
      targetType: "store",
    });

    expect(createFolderKey(vehicleDocument)).toBe("vehicle_listing:listing_1");
    expect(
      filterDocumentsByFolder(
        [vehicleDocument, storeDocument],
        "vehicle_listing:listing_1",
      ),
    ).toEqual([vehicleDocument]);
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
