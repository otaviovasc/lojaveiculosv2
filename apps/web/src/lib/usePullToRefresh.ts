import { useCallback, useEffect, useRef, useState } from "react";

type UsePullToRefreshOptions = {
  onRefresh: () => Promise<unknown> | void;
  pullThreshold?: number;
  maxPull?: number;
  disabled?: boolean;
};

export function usePullToRefresh<T extends HTMLElement>({
  onRefresh,
  pullThreshold = 42,
  maxPull = 80,
  disabled = false,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<T>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const startScrollTopRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const currentPullRef = useRef(0);
  const isRefreshingRef = useRef(false);

  isRefreshingRef.current = isRefreshing;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(pullThreshold);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      currentPullRef.current = 0;
    }
  }, [onRefresh, pullThreshold]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (element.scrollTop <= 0 && !isRefreshingRef.current) {
        const touch = e.touches[0];
        if (!touch) return;
        startYRef.current = touch.clientY;
        startScrollTopRef.current = element.scrollTop;
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        currentPullRef.current = 0;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || startYRef.current === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      const currentY = touch.clientY;
      const diff = currentY - startYRef.current;

      if (Math.abs(diff) > 4) {
        hasDraggedRef.current = true;
      }

      if (element.scrollTop <= 0 && diff > 0) {
        const pull = Math.min(maxPull, diff * 0.65);
        currentPullRef.current = pull;
        setPullDistance(pull);
        if (e.cancelable && pull > 6) {
          e.preventDefault();
        }
      } else {
        currentPullRef.current = 0;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      startYRef.current = null;

      if (currentPullRef.current >= pullThreshold && !isRefreshingRef.current) {
        void handleRefresh();
      } else {
        setPullDistance(0);
        currentPullRef.current = 0;
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      // Only initiate on left click and not currently refreshing
      if (e.button !== 0 || isRefreshingRef.current) return;
      const target = e.target as HTMLElement | null;
      // Do not block buttons in the list - we intercept on drag > 4px
      if (
        target?.closest(
          "input, select, textarea, [contenteditable='true'], [data-prevent-drag]",
        )
      ) {
        return;
      }

      startYRef.current = e.clientY;
      startScrollTopRef.current = element.scrollTop;
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      currentPullRef.current = 0;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || startYRef.current === null) return;
      const currentY = e.clientY;
      const diff = currentY - startYRef.current;

      if (Math.abs(diff) > 4) {
        hasDraggedRef.current = true;
        element.style.userSelect = "none";
      }

      if (startScrollTopRef.current <= 0 && diff > 0) {
        // Pull down zone
        const pull = Math.min(maxPull, diff * 0.65);
        currentPullRef.current = pull;
        setPullDistance(pull);
      } else {
        // Drag scroll zone
        currentPullRef.current = 0;
        setPullDistance(0);
        element.scrollTop = startScrollTopRef.current - diff * 1.3;
      }
    };

    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      startYRef.current = null;
      element.style.userSelect = "";

      if (currentPullRef.current >= pullThreshold && !isRefreshingRef.current) {
        void handleRefresh();
      } else {
        setPullDistance(0);
        currentPullRef.current = 0;
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      if (hasDraggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        hasDraggedRef.current = false;
      }
    };

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: true });
    element.addEventListener("mousedown", onMouseDown);
    element.addEventListener("click", onClickCapture, true);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("mousedown", onMouseDown);
      element.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [disabled, handleRefresh, maxPull, pullThreshold]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isTriggerReady: pullDistance >= pullThreshold,
  };
}
