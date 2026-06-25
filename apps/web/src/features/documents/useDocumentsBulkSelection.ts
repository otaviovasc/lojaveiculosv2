import { useCallback, useMemo, useState } from "react";
import type { WorkspaceDocument } from "./types";

type DownloadDocumentFn = (documentId: string) => Promise<void>;

/**
 * Tracks which documents the user has multi-selected for batch actions
 * (currently bulk download). Selection is scoped to whatever the caller
 * passes as `visibleDocuments` — when folder or filters change, the
 * caller should pass a new visible list and the count is recomputed
 * automatically.
 */
export function useDocumentsBulkSelection(
  visibleDocuments: readonly WorkspaceDocument[],
) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const visibleIdSet = useMemo(
    () => new Set(visibleDocuments.map((document) => document.id)),
    [visibleDocuments],
  );

  const visibleSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selectedIds) {
      if (visibleIdSet.has(id)) count += 1;
    }
    return count;
  }, [selectedIds, visibleIdSet]);

  const toggle = useCallback((documentId: string, next: boolean) => {
    setSelectedIds((current) => {
      const nextSet = new Set(current);
      if (next) nextSet.add(documentId);
      else nextSet.delete(documentId);
      return nextSet;
    });
  }, []);

  const toggleAll = useCallback(
    (next: boolean) => {
      setSelectedIds((current) => {
        if (!next) {
          let mutated = false;
          const nextSet = new Set(current);
          for (const id of visibleIdSet) {
            if (nextSet.delete(id)) mutated = true;
          }
          return mutated ? nextSet : current;
        }
        if (visibleIdSet.size === 0) return current;
        const nextSet = new Set(current);
        for (const id of visibleIdSet) nextSet.add(id);
        return nextSet;
      });
    },
    [visibleIdSet],
  );

  const clear = useCallback(() => setSelectedIds(new Set<string>()), []);

  const downloadSelected = useCallback(
    async (downloadDocument: DownloadDocumentFn) => {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        try {
          await downloadDocument(id);
        } catch {
          // downloadDocument already surfaces the error to module state; keep
          // going so a single failed download does not stop the batch.
        }
      }
    },
    [selectedIds],
  );

  return {
    clear,
    downloadSelected,
    selectedIds,
    toggle,
    toggleAll,
    visibleSelectedCount,
  };
}
