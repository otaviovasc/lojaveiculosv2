import { useEffect, useRef } from "react";

export function useDragToScroll<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasDragged = false;

    const onMouseDown = (e: MouseEvent) => {
      // Only drag on primary left click
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("input, select, textarea, [contenteditable='true']")
      ) {
        return;
      }
      isDown = true;
      hasDragged = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.style.userSelect = "none";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.35; // Responsive scroll feel
      if (Math.abs(walk) > 4) {
        hasDragged = true;
        el.style.cursor = "grabbing";
        el.scrollLeft = scrollLeft - walk;
      }
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = "";
      el.style.userSelect = "";
    };

    const onClickCapture = (e: MouseEvent) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        hasDragged = false;
      }
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("click", onClickCapture, true);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return containerRef;
}
