"use client";

import { cn } from "@/lib/utils";
import { Children, isValidElement, useMemo, type ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import {
  resolveTextBlockMarkdownPalette,
  type ResolvedMarkdownPalette,
  type TextBlockMarkdownColorProps,
} from "./text-block-markdown-palette";

export type TextBlockTextAlign = "left" | "center" | "right";

function listItemStartsWithCheckbox(children: ReactNode): boolean {
  return Children.toArray(children).some((n) => {
    if (!isValidElement(n)) return false;
    if (typeof n.type === "string" && n.type === "input") {
      return (n.props as { type?: string }).type === "checkbox";
    }
    return false;
  });
}

function ulHasTaskList(children: ReactNode): boolean {
  return Children.toArray(children).some((item) => {
    if (!isValidElement(item)) return false;
    const inner = (item.props as { children?: ReactNode }).children;
    return listItemStartsWithCheckbox(inner);
  });
}

function listRootClass(align: TextBlockTextAlign, isTaskList: boolean): string {
  if (isTaskList) {
    if (align === "center") {
      return "my-4 list-none space-y-2 pl-0 flex flex-col items-center";
    }
    if (align === "right") {
      return "my-4 list-none space-y-2 pl-0 flex flex-col items-end";
    }
    return "my-4 list-none space-y-2 pl-0";
  }
  if (align === "center") {
    return "my-4 list-inside list-disc space-y-2 text-center";
  }
  if (align === "right") {
    return "my-4 list-inside list-disc space-y-2 text-right";
  }
  return "my-4 list-inside list-disc space-y-2 text-left";
}

function orderedListClass(align: TextBlockTextAlign): string {
  if (align === "center") {
    return "my-4 list-inside list-decimal space-y-2 text-center";
  }
  if (align === "right") {
    return "my-4 list-inside list-decimal space-y-2 text-right";
  }
  return "my-4 list-inside list-decimal space-y-2 text-left";
}

function blockquoteClass(align: TextBlockTextAlign, invert: boolean): string {
  const base = invert
    ? "my-4 w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 italic"
    : "my-4 w-full rounded-lg border border-stone-900/15 bg-stone-900/[0.04] px-4 py-3 italic";
  if (align === "center") return cn(base, "text-center");
  if (align === "right") return cn(base, "text-right");
  return cn(base, "text-left");
}

function buildMarkdownComponents(
  p: ResolvedMarkdownPalette,
  align: TextBlockTextAlign,
  invert: boolean,
): Components {
  const preSurface = invert
    ? "border-white/15 bg-white/[0.08]"
    : "border-stone-900/15 bg-stone-900/[0.06]";
  const inlineCodeSurface = invert
    ? "border border-white/15 bg-white/10"
    : "border border-stone-900/10 bg-stone-900/10";

  return {
    h1: ({ children }) => (
      <h1
        className="mt-8 mb-3 text-3xl font-bold tracking-tight text-balance first:mt-0"
        style={{ color: p.h1 }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className="mt-10 mb-3 text-2xl font-bold tracking-tight"
        style={{ color: p.h2 }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className="mt-8 mb-2 text-xl font-semibold tracking-tight"
        style={{ color: p.h3 }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-6 mb-2 text-lg font-semibold" style={{ color: p.h456 }}>
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5
        className="mt-5 mb-2 text-base font-semibold"
        style={{ color: p.h456 }}
      >
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="mt-4 mb-2 text-sm font-semibold" style={{ color: p.h456 }}>
        {children}
      </h6>
    ),
    p: ({ children }) => (
      <p className="mb-4 leading-relaxed last:mb-0" style={{ color: p.body }}>
        {children}
      </p>
    ),
    ul: ({ children }) => {
      const isTask = ulHasTaskList(children);
      return (
        <ul
          className={cn(
            listRootClass(align, isTask),
            !isTask && "[&_li]:marker:text-current",
          )}
          style={{ color: p.list }}
        >
          {children}
        </ul>
      );
    },
    ol: ({ children }) => (
      <ol
        className={cn(orderedListClass(align), "[&_li]:marker:text-current")}
        style={{ color: p.list }}
      >
        {children}
      </ol>
    ),
    li: ({ children, node: _node, className }) => {
      const inTask = listItemStartsWithCheckbox(children);
      if (inTask) {
        const rowAlign =
          align === "center"
            ? "justify-center"
            : align === "right"
              ? "justify-end"
              : "justify-start";
        return (
          <li
            className={cn(
              "flex list-none items-start gap-2 leading-relaxed",
              rowAlign,
              className,
            )}
            style={{ color: p.list }}
          >
            {children}
          </li>
        );
      }
      return (
        <li
          className={cn("leading-relaxed", className)}
          style={{ color: p.list }}
        >
          {children}
        </li>
      );
    },
    strong: ({ children }) => (
      <strong className="font-semibold" style={{ color: "inherit" }}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic" style={{ color: "inherit" }}>
        {children}
      </em>
    ),
    a: ({ href, children, node: _aNode, ...rest }) => {
      const h = href ?? "";
      const safe =
        /^https?:\/\//i.test(h) ||
        h.startsWith("/") ||
        h.startsWith("#") ||
        h.startsWith("mailto:");
      if (!safe) {
        return <span style={{ color: p.body }}>{children}</span>;
      }
      const external = /^https?:\/\//i.test(h);
      return (
        <a
          href={h}
          style={{ color: p.link }}
          className="underline underline-offset-2 decoration-1 hover:opacity-90"
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          {...rest}
        >
          {children}
        </a>
      );
    },
    blockquote: ({ children }) => (
      <blockquote
        className={blockquoteClass(align, invert)}
        style={{ color: p.blockquote }}
      >
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr
        className={cn(
          "my-8 max-w-full border-0 border-t",
          invert ? "border-white/25" : "border-stone-300/80",
          align === "center" && "mx-auto max-w-md",
          align === "right" && "ml-auto max-w-md",
          align === "left" && "max-w-md",
        )}
      />
    ),
    code: ({ className, children }) => {
      const isFence = Boolean(className?.includes("language-"));
      if (isFence) {
        return (
          <code
            className={cn(
              className,
              "block w-full bg-transparent p-0 font-mono text-[0.9em] leading-relaxed text-inherit",
            )}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className={cn(
            "rounded-md px-1.5 py-0.5 font-mono text-[0.9em] leading-snug",
            inlineCodeSurface,
          )}
          style={{ color: p.code }}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        className={cn(
          "my-4 overflow-x-auto rounded-xl border p-4 font-mono text-sm leading-relaxed",
          preSurface,
        )}
        style={{ color: p.code }}
      >
        {children}
      </pre>
    ),
    table: ({ children }) => {
      const tableWrap =
        align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "";
      return (
        <div
          className={cn("my-4 w-full max-w-full overflow-x-auto", tableWrap)}
        >
          <table
            className={cn(
              "min-w-[16rem] border-collapse text-sm",
              align === "right" && "text-right",
              align === "center" && "text-center",
              align === "left" && "text-left",
            )}
          >
            {children}
          </table>
        </div>
      );
    },
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-stone-200 dark:border-white/10">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 font-semibold" style={{ color: p.th }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 align-top" style={{ color: p.td }}>
        {children}
      </td>
    ),
    input: ({ type, checked, ...rest }) =>
      type === "checkbox" ? (
        <input
          type="checkbox"
          checked={Boolean(checked)}
          readOnly
          className="mr-2 align-middle"
          style={{ accentColor: p.link }}
          {...rest}
        />
      ) : (
        <input type={type} {...rest} />
      ),
    img: ({ src, alt }) => {
      if (!src || !/^https?:\/\//i.test(String(src))) return null;
      const imgAlign =
        align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "";
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(src)}
          alt={String(alt ?? "")}
          className={cn(
            "my-4 block max-h-[28rem] w-full max-w-full rounded-lg object-contain",
            imgAlign,
          )}
        />
      );
    },
  };
}

export interface TextBlockMarkdownProps {
  content: string;
  className?: string;
  /** Dark section background → light typography defaults */
  invert?: boolean;
  /** Section default text (from style or auto) — fallback for roles */
  baseTextColor: string;
  markdownColors?: TextBlockMarkdownColorProps;
  /** Block alignment from editor (lists, quotes, code follow this). */
  textAlign?: TextBlockTextAlign;
}

export function TextBlockMarkdown({
  content,
  className,
  invert = false,
  baseTextColor,
  markdownColors,
  textAlign = "left",
}: TextBlockMarkdownProps) {
  const palette = useMemo(
    () =>
      resolveTextBlockMarkdownPalette(
        baseTextColor,
        invert,
        markdownColors ?? {},
      ),
    [baseTextColor, invert, markdownColors],
  );

  const components = useMemo(
    () => buildMarkdownComponents(palette, textAlign, invert),
    [palette, textAlign, invert],
  );

  return (
    <div
      className={cn(
        "text-base leading-relaxed md:text-lg [&_a]:break-words",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
