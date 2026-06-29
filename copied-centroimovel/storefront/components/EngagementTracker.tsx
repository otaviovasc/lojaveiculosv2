"use client";

import { useEngagementTracking } from "@/modules/storefront/lib/engagement-tracking";
import { useEffect } from "react";

interface EngagementTrackerProps {
  workspaceId: string;
  resourceId?: string;
  resourceType?: string;
}

/**
 * Client-side component to track comprehensive engagement metrics
 * Tracks: scroll depth, time on page, visibility, and interactions
 */
export function EngagementTracker({
  workspaceId,
  resourceId,
  resourceType = "page",
}: EngagementTrackerProps) {
  const { trackElementVisibility } = useEngagementTracking({
    workspaceId,
    resourceId,
    resourceType,
  });

  // Track key page sections visibility
  useEffect(() => {
    // Track hero section
    trackElementVisibility("hero-section", 0.5);

    // Track properties section
    trackElementVisibility("properties-section", 0.3);

    // Track about section
    trackElementVisibility("about-section", 0.3);

    // Track contact section
    trackElementVisibility("contact-section", 0.3);
  }, [trackElementVisibility]);

  return null;
}
