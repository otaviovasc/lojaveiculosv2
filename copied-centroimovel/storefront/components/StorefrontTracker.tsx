"use client";

import { trackEvent } from "@/modules/storefront/lib/tracker";
import { useEffect, useRef } from "react";

interface StorefrontTrackerProps {
  workspaceId: string;
  action?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  userId?: string | null;
}

export function StorefrontTracker({
  workspaceId,
  action = "page_view",
  resourceId,
  metadata,
  userId,
}: StorefrontTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackEvent(action, workspaceId, { resourceId, metadata, userId });
  }, [action, workspaceId, resourceId, metadata, userId]);

  return null;
}
