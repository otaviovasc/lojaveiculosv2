import { useCallback, useEffect, useState } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import { asError } from "./crmConversationHookSupport";
import type {
  CrmConnectionId,
  CrmCreateTagInput,
  CrmReorderTagsInput,
  CrmTag,
  CrmUpdateTagInput,
} from "./crmConversationTypes";

export function useCrmTags({
  api,
  canRead,
  connectionId,
  connectionsError,
  setError,
}: {
  api: CrmConversationApi;
  canRead: boolean;
  connectionId: CrmConnectionId | null;
  connectionsError: Error | null;
  setError: (error: Error) => void;
}) {
  const [availableTags, setAvailableTags] = useState<CrmTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const refreshTags = useCallback(async () => {
    const nextTags = await api.listTags({
      ...(connectionId ? { connectionId } : {}),
    });
    setAvailableTags(nextTags);
    return nextTags;
  }, [api, connectionId]);

  useEffect(() => {
    if (connectionsError || !connectionId || !canRead) {
      setAvailableTags([]);
      return;
    }
    let active = true;
    void refreshTags()
      .then((nextTags) => {
        if (active) setAvailableTags([...nextTags]);
      })
      .catch((caught) => {
        if (active) setError(asError(caught));
      });
    return () => {
      active = false;
    };
  }, [canRead, connectionId, connectionsError, refreshTags, setError]);

  const toggleTagFilter = useCallback((tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((item) => item !== tagId)
        : [...current, tagId],
    );
  }, []);

  const createTag = useCallback(
    async (input: CrmCreateTagInput) => {
      try {
        await api.createTag({
          ...input,
          connectionId: input.connectionId ?? connectionId,
        });
        await refreshTags();
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, connectionId, refreshTags, setError],
  );

  const updateTag = useCallback(
    async (tagId: string, input: CrmUpdateTagInput) => {
      try {
        await api.updateTag(tagId, input);
        await refreshTags();
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, refreshTags, setError],
  );

  const deleteTag = useCallback(
    async (tagId: string) => {
      try {
        await api.deleteTag(tagId);
        setSelectedTagIds((current) => current.filter((id) => id !== tagId));
        await refreshTags();
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, refreshTags, setError],
  );

  const reorderTags = useCallback(
    async (input: CrmReorderTagsInput) => {
      try {
        const nextTags = await api.reorderTags(input);
        setAvailableTags(nextTags);
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, setError],
  );

  return {
    availableTags,
    createTag,
    deleteTag,
    refreshTags,
    reorderTags,
    selectedTagIds,
    toggleTagFilter,
    updateTag,
  };
}
