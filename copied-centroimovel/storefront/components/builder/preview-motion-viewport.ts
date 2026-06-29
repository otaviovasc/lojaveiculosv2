import type { HTMLMotionProps } from "framer-motion";

export type MotionViewport = NonNullable<HTMLMotionProps<"div">["viewport"]>;

/**
 * In the admin iframe preview, `whileInView` / `useInView` must use the iframe's scroll root
 * (`document.body`), otherwise the observer uses the parent window and content never “enters view”.
 */
export function withPreviewMotionViewport<V extends MotionViewport>(
  previewDocument: globalThis.Document | null | undefined,
  viewport: V | undefined,
): V | undefined {
  if (!viewport) return viewport;
  const body = previewDocument?.body;
  if (!body) return viewport;
  return { ...viewport, root: body };
}
