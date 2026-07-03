import { useCallback, useEffect, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappConnectionId,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

export function useCrmWhatsappTags({
  api,
  canRead,
  connectionId,
  connectionsError,
  setError,
}: {
  api: CrmWhatsappApi;
  canRead: boolean;
  connectionId: CrmWhatsappConnectionId | null;
  connectionsError: Error | null;
  setError: (error: Error) => void;
}) {
  const [availableTags, setAvailableTags] = useState<CrmWhatsappTag[]>([]);
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

  return { availableTags, refreshTags, selectedTagIds, toggleTagFilter };
}
