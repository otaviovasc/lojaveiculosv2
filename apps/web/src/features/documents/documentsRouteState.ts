export type DocumentsRouteState = {
  documentId: string | null;
  unitId: string | null;
};

export function documentsRouteHash(state: DocumentsRouteState) {
  const params = new URLSearchParams();
  if (state.unitId) params.set("unitId", state.unitId);
  if (state.documentId) params.set("documentId", state.documentId);
  const query = params.toString();
  return `#/documents${query ? `?${query}` : ""}`;
}

export function readDocumentsRouteState(hash: string): DocumentsRouteState {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?", 2);
  if (path !== "documents") return emptyDocumentsRouteState;
  const params = new URLSearchParams(query);
  return {
    documentId: cleanRouteId(params.get("documentId")),
    unitId: cleanRouteId(params.get("unitId")),
  };
}

const emptyDocumentsRouteState: DocumentsRouteState = {
  documentId: null,
  unitId: null,
};

function cleanRouteId(value: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}
