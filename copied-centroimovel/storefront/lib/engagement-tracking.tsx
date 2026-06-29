"use client";

import { useCallback, useEffect, useRef } from "react";
import { trackEvent } from "./tracker";

interface UseEngagementTrackingProps {
  workspaceId: string;
  resourceId?: string;
  resourceType?: string;
}

/**
 * Comprehensive engagement tracking hook
 * Tracks: scroll depth, time on page, visibility, and interactions
 */
export function useEngagementTracking({
  workspaceId,
  resourceId,
  resourceType = "page",
}: UseEngagementTrackingProps) {
  const startTimeRef = useRef<number>(Date.now());
  const scrollDepthsRef = useRef<Set<number>>(new Set());
  const scrollRunMaxRef = useRef<number>(0);
  const trackedVisibilityRef = useRef<Set<string>>(new Set());
  const interactionCountRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());

  // Track scroll depth milestones
  useEffect(() => {
    const milestones = [25, 50, 75, 90, 100];
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const resetScrollRun = () => {
      scrollRunMaxRef.current = 0;
    };

    const scheduleReset = () => {
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(resetScrollRun, 2500);
    };

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      const runMax = Math.max(scrollRunMaxRef.current, scrollPercent);
      scrollRunMaxRef.current = runMax;

      scheduleReset();

      milestones.forEach((milestone) => {
        if (runMax >= milestone && !scrollDepthsRef.current.has(milestone)) {
          scrollDepthsRef.current.add(milestone);
          trackEvent("scroll_depth", workspaceId, {
            resourceId,
            metadata: {
              depth_percent: milestone,
              resource_type: resourceType,
              scroll_pixels: scrollTop,
            },
          });
        }
      });

      lastActivityRef.current = Date.now();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [workspaceId, resourceId, resourceType]);

  // Track time on page milestones
  useEffect(() => {
    const timeMilestones = [
      { time: 10000, label: "10s" },
      { time: 30000, label: "30s" },
      { time: 60000, label: "1m" },
      { time: 120000, label: "2m" },
      { time: 300000, label: "5m" },
      { time: 600000, label: "10m" },
    ];

    const trackedTimes = new Set<number>();

    const interval = setInterval(() => {
      const timeOnPage = Date.now() - startTimeRef.current;

      timeMilestones.forEach(({ time, label }) => {
        if (timeOnPage >= time && !trackedTimes.has(time)) {
          trackedTimes.add(time);
          trackEvent("engagement_time", workspaceId, {
            resourceId,
            metadata: {
              time_seconds: time / 1000,
              time_label: label,
              resource_type: resourceType,
              interaction_count: interactionCountRef.current,
            },
            duration: time,
          });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [workspaceId, resourceId, resourceType]);

  // Track element visibility (using Intersection Observer)
  const trackElementVisibility = useCallback(
    (elementId: string, threshold: number = 0.5) => {
      if (trackedVisibilityRef.current.has(elementId)) return;

      const element = document.getElementById(elementId);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
              trackedVisibilityRef.current.add(elementId);
              trackEvent("element_view", workspaceId, {
                resourceId,
                metadata: {
                  element_id: elementId,
                  visibility_ratio: entry.intersectionRatio,
                  resource_type: resourceType,
                },
              });
              observer.disconnect();
            }
          });
        },
        { threshold: [threshold] },
      );

      observer.observe(element);
      return () => observer.disconnect();
    },
    [workspaceId, resourceId, resourceType],
  );

  // Track user interactions
  useEffect(() => {
    const handleInteraction = () => {
      interactionCountRef.current++;
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("click", handleInteraction, { passive: true });
    window.addEventListener("touchstart", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction, { passive: true });
    window.addEventListener("scroll", handleInteraction, { passive: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
    };
  }, []);

  // Track page exit with final engagement metrics
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeOnPage = Date.now() - startTimeRef.current;
      const maxScroll = Math.max(...scrollDepthsRef.current, 0);

      trackEvent("page_exit", workspaceId, {
        resourceId,
        metadata: {
          total_time_seconds: Math.round(timeOnPage / 1000),
          max_scroll_depth: maxScroll,
          total_interactions: interactionCountRef.current,
          resource_type: resourceType,
        },
        duration: timeOnPage,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [workspaceId, resourceId, resourceType]);

  return {
    trackElementVisibility,
    getEngagementMetrics: () => ({
      timeOnPage: Date.now() - startTimeRef.current,
      scrollDepths: Array.from(scrollDepthsRef.current),
      interactions: interactionCountRef.current,
    }),
  };
}

/**
 * Hook to track specific element clicks
 */
export function useClickTracking(
  workspaceId: string,
  action: string,
  metadata?: Record<string, unknown>,
) {
  return useCallback(
    (e: React.MouseEvent, additionalMetadata?: Record<string, unknown>) => {
      trackEvent(action, workspaceId, {
        metadata: {
          ...metadata,
          ...additionalMetadata,
          click_x: e.clientX,
          click_y: e.clientY,
        },
      });
    },
    [workspaceId, action, metadata],
  );
}

/**
 * Hook to track hover interactions
 */
export function useHoverTracking(
  workspaceId: string,
  resourceId: string,
  resourceType: string = "element",
) {
  const hoverStartRef = useRef<number | null>(null);
  const hasTrackedRef = useRef<boolean>(false);

  const handleMouseEnter = useCallback(() => {
    hoverStartRef.current = Date.now();
    hasTrackedRef.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverStartRef.current) {
      const hoverDuration = Date.now() - hoverStartRef.current;

      // Only track if hovered for more than 500ms or if we haven't tracked this session
      if (hoverDuration > 500 && !hasTrackedRef.current) {
        hasTrackedRef.current = true;
        trackEvent("hover", workspaceId, {
          resourceId,
          metadata: {
            resource_type: resourceType,
            hover_duration_ms: hoverDuration,
          },
          duration: hoverDuration,
        });
      }
    }
    hoverStartRef.current = null;
  }, [workspaceId, resourceId, resourceType]);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };
}

/**
 * Track video engagement
 */
export function useVideoTracking(
  workspaceId: string,
  videoId: string,
  videoTitle?: string,
) {
  const trackedEvents = useRef<Set<string>>(new Set());
  const watchStartRef = useRef<number | null>(null);

  const trackVideoEvent = useCallback(
    (event: string, data?: Record<string, unknown>) => {
      const eventKey = `${videoId}_${event}`;
      if (trackedEvents.current.has(eventKey)) return;

      trackedEvents.current.add(eventKey);
      trackEvent(`video_${event}`, workspaceId, {
        resourceId: videoId,
        metadata: {
          video_title: videoTitle,
          ...data,
        },
      });
    },
    [workspaceId, videoId, videoTitle],
  );

  const handlePlay = useCallback(() => {
    watchStartRef.current = Date.now();
    trackVideoEvent("play");
  }, [trackVideoEvent]);

  const handlePause = useCallback(
    (currentTime: number, duration: number) => {
      if (watchStartRef.current) {
        const watchDuration = Date.now() - watchStartRef.current;
        trackEvent("video_pause", workspaceId, {
          resourceId: videoId,
          metadata: {
            video_title: videoTitle,
            current_time: currentTime,
            video_duration: duration,
            watch_duration_ms: watchDuration,
            percent_watched: Math.round((currentTime / duration) * 100),
          },
          duration: watchDuration,
        });
      }
    },
    [workspaceId, videoId, videoTitle],
  );

  const handleEnded = useCallback(() => {
    trackVideoEvent("complete");
    watchStartRef.current = null;
  }, [trackVideoEvent]);

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      const percent = Math.round((currentTime / duration) * 100);

      // Track quartiles
      if (percent >= 25 && percent < 30) trackVideoEvent("25_percent");
      if (percent >= 50 && percent < 55) trackVideoEvent("50_percent");
      if (percent >= 75 && percent < 80) trackVideoEvent("75_percent");
    },
    [trackVideoEvent],
  );

  return {
    onPlay: handlePlay,
    onPause: handlePause,
    onEnded: handleEnded,
    onTimeUpdate: handleTimeUpdate,
  };
}

/**
 * Track photo gallery interactions
 */
export function usePhotoGalleryTracking(
  workspaceId: string,
  propertyId: string,
) {
  const galleryOpenTimeRef = useRef<number | null>(null);
  const photosViewedRef = useRef<Set<number>>(new Set());
  const trackedEvents = useRef<Set<string>>(new Set());

  const trackGalleryEvent = useCallback(
    (event: string, data?: Record<string, unknown>, duration?: number) => {
      trackEvent(`gallery_${event}`, workspaceId, {
        resourceId: propertyId,
        metadata: {
          property_id: propertyId,
          ...data,
        },
        duration,
      });
    },
    [workspaceId, propertyId],
  );

  const handleOpen = useCallback(() => {
    galleryOpenTimeRef.current = Date.now();
    photosViewedRef.current.clear();
    trackGalleryEvent("open");
  }, [trackGalleryEvent]);

  const handleClose = useCallback(() => {
    if (galleryOpenTimeRef.current) {
      const duration = Date.now() - galleryOpenTimeRef.current;
      trackGalleryEvent(
        "close",
        {
          total_duration_ms: duration,
          photos_viewed: photosViewedRef.current.size,
        },
        duration,
      );
    }
    galleryOpenTimeRef.current = null;
  }, [trackGalleryEvent]);

  const handlePhotoView = useCallback(
    (photoIndex: number, totalPhotos: number) => {
      photosViewedRef.current.add(photoIndex);

      const eventKey = `photo_${photoIndex}`;
      if (!trackedEvents.current.has(eventKey)) {
        trackedEvents.current.add(eventKey);
        trackGalleryEvent("photo_view", {
          photo_index: photoIndex,
          total_photos: totalPhotos,
          photo_number: photoIndex + 1,
        });
      }
    },
    [trackGalleryEvent],
  );

  const handleNavigation = useCallback(
    (direction: "next" | "prev", fromIndex: number, toIndex: number) => {
      trackGalleryEvent("navigate", {
        direction,
        from_index: fromIndex,
        to_index: toIndex,
      });
    },
    [trackGalleryEvent],
  );

  const handleZoom = useCallback(
    (photoIndex: number) => {
      trackGalleryEvent("zoom", { photo_index: photoIndex });
    },
    [trackGalleryEvent],
  );

  return {
    onOpen: handleOpen,
    onClose: handleClose,
    onPhotoView: handlePhotoView,
    onNavigate: handleNavigation,
    onZoom: handleZoom,
  };
}

interface SearchTrackingReturn {
  onSearchStart: () => void;
  onSearchSubmit: (query: string, resultsCount: number) => void;
  onFilterChange: (filterName: string, value: unknown) => void;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
}

/**
 * Track search and filter usage
 */
export function useSearchTracking(workspaceId?: string): SearchTrackingReturn {
  const searchStartTimeRef = useRef<number | null>(null);
  const filtersAppliedRef = useRef<Record<string, unknown>>({});

  const handleSearchStart = useCallback(() => {
    searchStartTimeRef.current = Date.now();
  }, []);

  const handleSearchSubmit = useCallback(
    (query: string, resultsCount: number) => {
      if (!workspaceId) return;

      const searchDuration = searchStartTimeRef.current
        ? Date.now() - searchStartTimeRef.current
        : 0;

      trackEvent("search_properties", workspaceId, {
        metadata: {
          query,
          results_count: resultsCount,
          search_duration_ms: searchDuration,
        },
        duration: searchDuration,
      });
    },
    [workspaceId],
  );

  const handleFilterChange = useCallback(
    (filterName: string, value: unknown) => {
      if (!workspaceId) return;

      filtersAppliedRef.current[filterName] = value;

      trackEvent("filter_apply", workspaceId, {
        metadata: {
          filter_name: filterName,
          filter_value: value,
          all_filters: { ...filtersAppliedRef.current },
        },
      });
    },
    [workspaceId],
  );

  const handleSortChange = useCallback(
    (sortBy: string, sortOrder: "asc" | "desc") => {
      if (!workspaceId) return;

      trackEvent("sort_change", workspaceId, {
        metadata: {
          sort_by: sortBy,
          sort_order: sortOrder,
        },
      });
    },
    [workspaceId],
  );

  return {
    onSearchStart: handleSearchStart,
    onSearchSubmit: handleSearchSubmit,
    onFilterChange: handleFilterChange,
    onSortChange: handleSortChange,
  };
}

/**
 * Track contact interactions
 */
export function useContactTracking(workspaceId: string, propertyId?: string) {
  const trackContact = useCallback(
    (
      type: "whatsapp" | "phone" | "email" | "form",
      metadata?: Record<string, unknown>,
    ) => {
      trackEvent(`contact_click_${type}`, workspaceId, {
        resourceId: propertyId,
        metadata: {
          contact_type: type,
          property_id: propertyId,
          ...metadata,
        },
      });
    },
    [workspaceId, propertyId],
  );

  const trackWhatsApp = useCallback(
    (phone: string, message?: string) => {
      trackContact("whatsapp", { phone, message_length: message?.length });
    },
    [trackContact],
  );

  const trackPhone = useCallback(
    (phone: string) => {
      trackContact("phone", { phone });
    },
    [trackContact],
  );

  const trackEmail = useCallback(
    (email: string, subject?: string) => {
      trackContact("email", { email, subject });
    },
    [trackContact],
  );

  const trackFormStart = useCallback(() => {
    trackEvent("form_start", workspaceId, {
      resourceId: propertyId,
      metadata: { property_id: propertyId },
    });
  }, [workspaceId, propertyId]);

  const trackFormSubmit = useCallback(
    (success: boolean, formData?: Record<string, unknown>) => {
      trackEvent("form_submit", workspaceId, {
        resourceId: propertyId,
        metadata: {
          property_id: propertyId,
          success,
          form_fields: Object.keys(formData || {}),
        },
      });
    },
    [workspaceId, propertyId],
  );

  return {
    trackWhatsApp,
    trackPhone,
    trackEmail,
    trackFormStart,
    trackFormSubmit,
  };
}
