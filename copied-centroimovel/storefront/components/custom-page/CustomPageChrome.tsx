"use client";

import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { PageChrome } from "@centroimovel/types";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  customPageHeaderPositionClass,
  customPageHeaderRowClass,
  customPageHeaderRowStyle,
  customPageMainPaddingClass,
} from "../../lib/custom-page-chrome";

/**
 * Next.js `<Link>` can omit visible children when the tree is portaled into an
 * iframe document (admin page preview). Plain anchors behave correctly there.
 */
function ChromeNavLink({
  embedded,
  href,
  className,
  style,
  children,
}: {
  embedded: boolean;
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (embedded) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

interface CustomPageChromeProps {
  slug: string;
  corretorName?: string;
  logoUrl?: string | null;
  pageChrome?: PageChrome | null;
  /** Admin preview: header sticks to the preview panel, not the window. */
  embedded?: boolean;
  children: React.ReactNode;
}

export function CustomPageChrome({
  slug,
  corretorName,
  logoUrl,
  pageChrome,
  embedded = false,
  children,
}: CustomPageChromeProps) {
  const position = embedded ? "sticky" : "fixed";
  const showHeader = pageChrome?.showHeader !== false;
  const showFooter = pageChrome?.showFooter !== false;
  const link = pageChrome?.showSiteLink !== false;

  return (
    <>
      {showHeader ? (
        <header
          className={cn(
            customPageHeaderPositionClass(position),
            customPageHeaderRowClass(pageChrome),
          )}
          style={customPageHeaderRowStyle(pageChrome)}
        >
          <ChromeNavLink
            embedded={embedded}
            href={`/${slug}`}
            className="flex items-center gap-2 transition-opacity hover:opacity-70"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={corretorName ?? "Logo"}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <Logo variant="full" className="h-7" />
            )}
          </ChromeNavLink>
          {link ? (
            <ChromeNavLink
              embedded={embedded}
              href={`/${slug}`}
              className={
                pageChrome?.headerLinkColor
                  ? "text-xs transition-opacity hover:opacity-75"
                  : "text-xs text-stone-600 transition-colors hover:text-stone-900"
              }
              style={
                pageChrome?.headerLinkColor
                  ? { color: pageChrome.headerLinkColor }
                  : undefined
              }
            >
              Voltar ao site
            </ChromeNavLink>
          ) : null}
        </header>
      ) : null}

      <main
        className={cn(
          "relative z-10",
          showHeader ? customPageMainPaddingClass(position) : "",
        )}
      >
        {children}
      </main>

      {showFooter ? (
        <footer
          className={cn(
            "relative z-10 border-t border-black/5 py-8 text-center text-sm",
            !pageChrome?.footerChromeTextColor &&
              (embedded
                ? "text-stone-600 dark:text-stone-400"
                : "text-stone-500"),
          )}
          style={
            pageChrome?.footerChromeTextColor
              ? { color: pageChrome.footerChromeTextColor }
              : undefined
          }
        >
          <ChromeNavLink
            embedded={embedded}
            href={`/${slug}`}
            className={cn(
              "transition-opacity hover:opacity-80",
              !pageChrome?.footerChromeTextColor &&
                (embedded
                  ? "hover:text-stone-900 dark:hover:text-stone-200"
                  : "hover:text-stone-800"),
            )}
            style={
              pageChrome?.footerChromeTextColor
                ? { color: pageChrome.footerChromeTextColor }
                : undefined
            }
          >
            © {new Date().getFullYear()} {corretorName || slug}
          </ChromeNavLink>
          {pageChrome?.footerExtraLine ? (
            <p
              className={cn(
                "mt-2 max-w-lg mx-auto text-xs opacity-90",
                !pageChrome?.footerChromeTextColor &&
                  embedded &&
                  "text-stone-600 dark:text-stone-400",
              )}
            >
              {pageChrome.footerExtraLine}
            </p>
          ) : null}
        </footer>
      ) : null}
    </>
  );
}
