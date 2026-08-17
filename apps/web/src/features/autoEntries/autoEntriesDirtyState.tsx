import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useId,
  type ReactNode,
} from "react";
import type { AutoEntryWorkspaceTab } from "./types";

/**
 * Dirty-state registry for the auto-entries workspace.
 *
 * Domain editing cards (financing, insurance, consortium, documentation, …)
 * track their own form state; this module lets them report "unsaved changes"
 * up to the workspace so it can:
 *  - mark the tab label with a dirty dot, and
 *  - block a tab switch behind a confirm dialog instead of silently remounting
 *    the tab content (`key={activeTab}`) and discarding the input.
 *
 * Card/panel integration (owner: domain-card agent): call
 * `useAutoEntryDirty(tab, isDirty)` near the top of the card or panel
 * component, where `tab` is the workspace tab the card edits and `isDirty`
 * reflects whether the local draft differs from the last saved state. The
 * hook is a no-op outside the workspace provider, so panels keep working in
 * isolation and in tests.
 */
type DirtyRegistry = (
  tab: AutoEntryWorkspaceTab,
  source: string,
  isDirty: boolean,
) => void;

const AutoEntriesDirtyContext = createContext<DirtyRegistry | null>(null);

/** Workspace-side state holder: tracks which tabs currently have unsaved edits. */
export function useAutoEntriesDirtyState() {
  // Keyed by `${tab}:${source}` so multiple cards on the same tab (e.g. the
  // two sale cards) never overwrite each other's flag.
  const [dirtySources, setDirtySources] = useState<
    ReadonlyMap<string, boolean>
  >(() => new Map());

  const registerDirty = useCallback<DirtyRegistry>((tab, source, isDirty) => {
    const key = `${tab}:${source}`;
    setDirtySources((previous) => {
      if ((previous.get(key) ?? false) === isDirty) return previous;
      const next = new Map(previous);
      if (isDirty) next.set(key, true);
      else next.delete(key);
      return next;
    });
  }, []);

  const clearDirty = useCallback((tab: AutoEntryWorkspaceTab) => {
    setDirtySources((previous) => {
      if (![...previous.keys()].some((key) => key.startsWith(`${tab}:`))) {
        return previous;
      }
      const next = new Map(previous);
      for (const key of next.keys()) {
        if (key.startsWith(`${tab}:`)) next.delete(key);
      }
      return next;
    });
  }, []);

  const dirtyTabs: ReadonlySet<AutoEntryWorkspaceTab> = new Set(
    [...dirtySources.keys()].map((key) => {
      const separator = key.indexOf(":");
      return key.slice(0, separator) as AutoEntryWorkspaceTab;
    }),
  );

  return { clearDirty, dirtyTabs, registerDirty };
}

export function AutoEntriesDirtyProvider({
  children,
  registerDirty,
}: {
  children: ReactNode;
  registerDirty: DirtyRegistry;
}) {
  return (
    <AutoEntriesDirtyContext.Provider value={registerDirty}>
      {children}
    </AutoEntriesDirtyContext.Provider>
  );
}

/**
 * Card/panel-side hook: publish the dirty flag of a domain editing card.
 * Registers on mount/update and unregisters on unmount (e.g. after the user
 * confirms discarding changes and the tab content remounts).
 */
export function useAutoEntryDirty(
  tab: AutoEntryWorkspaceTab,
  isDirty: boolean,
) {
  const registerDirty = useContext(AutoEntriesDirtyContext);
  const source = useId();
  useEffect(() => {
    if (!registerDirty) return undefined;
    registerDirty(tab, source, isDirty);
    return () => registerDirty(tab, source, false);
  }, [registerDirty, tab, source, isDirty]);
}
