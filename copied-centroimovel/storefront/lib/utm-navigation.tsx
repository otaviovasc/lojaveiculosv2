"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

/**
 * Hook to get current UTM parameters as a query string
 */
export function useUtmParams(): string {
  const searchParams = useSearchParams();
  const utmParams = new URLSearchParams();

  for (const key of UTM_KEYS) {
    const value = searchParams.get(key);
    if (value) {
      utmParams.set(key, value);
    }
  }

  const queryString = utmParams.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Preserves UTM parameters when navigating
 */
export function preserveUtmParams(
  href: string,
  currentSearchParams: URLSearchParams | string,
): string {
  const url = new URL(
    href,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  const params =
    typeof currentSearchParams === "string"
      ? new URLSearchParams(currentSearchParams)
      : currentSearchParams;

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  return url.pathname + url.search;
}

interface UtmLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
}

/**
 * Link component that preserves UTM parameters
 */
export function UtmLink({ href, children, ...props }: UtmLinkProps) {
  const utmSuffix = useUtmParams();
  const fullHref = utmSuffix ? `${href}${utmSuffix}` : href;

  return (
    <Link href={fullHref} {...props}>
      {children}
    </Link>
  );
}

interface UtmAwareLinkProps {
  href: string;
  children: ReactNode;
  preserveUtm?: boolean;
  className?: string;
  [key: string]: unknown;
}

/**
 * Link component that optionally preserves UTM parameters
 * Set preserveUtm to false to skip UTM preservation
 */
export function StorefrontLink({
  href,
  children,
  preserveUtm = true,
  ...props
}: UtmAwareLinkProps) {
  const utmSuffix = useUtmParams();
  const fullHref = preserveUtm && utmSuffix ? `${href}${utmSuffix}` : href;

  return (
    <Link href={fullHref} {...props}>
      {children}
    </Link>
  );
}
