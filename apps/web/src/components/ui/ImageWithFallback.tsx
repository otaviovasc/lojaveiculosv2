import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders an image and swaps to the provided fallback node when the source is
 * missing or fails to load, so broken media never shows raw alt text.
 */
export function ImageWithFallback({
  alt,
  className,
  fallback,
  src,
}: {
  alt: string;
  className?: string;
  fallback: ReactNode;
  src: string | null | undefined;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;
  return (
    <img
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      src={src}
    />
  );
}
