"use client";

import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { motion, useInView, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useContext, useRef, type ReactNode } from "react";
import { SectionSurface } from "./SectionSurface";
import { PreviewDocumentContext } from "./preview-document-context";
import { formatCssFontStack } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

function resolveFooterSurfaceStyle(
  style?: ComponentStyleProps,
): ComponentStyleProps {
  const hasUnifiedBg = style?.background != null;
  const hasLegacyBg = Boolean(
    style?.backgroundColor || style?.backgroundImageUrl,
  );

  if (!style) {
    return {
      textColor: "#FFFFFF",
      background: { type: "solid", solidColor: "#1A1A1A" },
    } as ComponentStyleProps;
  }

  if (hasUnifiedBg || hasLegacyBg) {
    return {
      ...style,
      textColor:
        style.textColor ??
        (hasUnifiedBg ? defaultTextColorForTextBlock(style) : "#FFFFFF"),
    };
  }

  return {
    ...style,
    textColor: style.textColor ?? "#FFFFFF",
    background: { type: "solid", solidColor: "#1A1A1A" },
  } as ComponentStyleProps;
}

interface FooterLink {
  title: string;
  href: string;
  icon?: string;
}

interface FooterColumn {
  label: string;
  links: FooterLink[];
}

interface BuilderFooterProps {
  columns?: FooterColumn[];
  logoText?: string;
  copyrightText?: string;
  showSocial?: boolean;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
    whatsapp?: string;
  };
  style?: ComponentStyleProps;
  config: StoreConfig;
  /** Vitra workspace name when `corretorName` / `logoText` are empty */
  workspaceDisplayName?: string | null;
}

function AnimatedContainer({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previewDocument = useContext(PreviewDocumentContext);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const shouldReduceMotion = useReducedMotion();

  // In iframe preview, intersection observers can miss nested portal content.
  // Render statically so footer text never stays invisible (opacity 0).
  if (shouldReduceMotion || previewDocument) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ filter: "blur(8px)", translateY: 20, opacity: 0 }}
      animate={
        isInView ? { filter: "blur(0px)", translateY: 0, opacity: 1 } : {}
      }
      transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const SocialIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const icons: Record<string, ReactNode> = {
    facebook: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
    instagram: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="5"
          ry="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="17.5"
          y1="6.5"
          x2="17.51"
          y2="6.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    youtube: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
        <polygon
          points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"
          fill="white"
        />
      </svg>
    ),
    linkedin: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    whatsapp: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  };

  return icons[name] || null;
};

export function BuilderFooter({
  columns = [],
  logoText,
  copyrightText,
  showSocial = true,
  socialLinks = {},
  style,
  config,
  workspaceDisplayName,
}: BuilderFooterProps) {
  const previewDocument = useContext(PreviewDocumentContext);
  const isEmbeddedPreview = Boolean(previewDocument);
  const surfaceStyle = resolveFooterSurfaceStyle(style);
  const linkColor = surfaceStyle.textColor ?? "#FFFFFF";
  const accentColor = config.accentColor || "#C9A84C";
  const headingFont = formatCssFontStack(
    style?.fontFamily || config.fonts?.heading,
  );
  const bodyFont = formatCssFontStack(style?.fontFamily || config.fonts?.body);

  const storeBrand =
    workspaceDisplayName?.trim() || config.corretorName?.trim() || null;
  const displayLogo =
    (logoText && logoText.trim()) || storeBrand || "Centroimovel";
  const copyrightEntity = storeBrand || displayLogo;
  const corretorLine = config.corretorName?.trim() || null;
  const workspaceLine = workspaceDisplayName?.trim() || null;
  const subline =
    corretorLine && corretorLine !== displayLogo
      ? corretorLine
      : workspaceLine && workspaceLine !== displayLogo
        ? workspaceLine
        : null;

  const year = new Date().getFullYear();
  const defaultCopyright = `© ${year} ${copyrightEntity}. Todos os direitos reservados.`;

  return (
    <SectionSurface
      as="footer"
      style={surfaceStyle}
      className="relative w-full px-6 py-20 lg:py-24"
    >
      <div
        className="absolute top-0 right-1/2 left-1/2 h-px w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl opacity-50"
        style={{ backgroundColor: accentColor }}
      />

      <div
        className="mx-auto max-w-7xl [&_a]:no-underline"
        style={{ color: linkColor }}
      >
        <div className="grid gap-16 xl:grid-cols-4 xl:gap-12">
          <AnimatedContainer className="xl:col-span-1 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {config.corretorPhotoUrl && (
                  <img
                    src={config.corretorPhotoUrl}
                    alt={displayLogo}
                    className="h-12 w-12 rounded-full object-cover border-2 border-white/10 shadow-lg"
                  />
                )}
                <span
                  className="text-2xl font-black tracking-tighter"
                  style={{ color: accentColor, fontFamily: headingFont }}
                >
                  {displayLogo}
                </span>
              </div>
              {subline && subline !== displayLogo ? (
                <p
                  className="text-sm opacity-60 font-medium leading-relaxed"
                  style={{ fontFamily: bodyFont }}
                >
                  {subline}
                </p>
              ) : null}
            </div>

            <p
              className="text-xs opacity-40 font-bold uppercase tracking-[0.15em] leading-loose"
              style={{ fontFamily: bodyFont }}
            >
              {copyrightText || defaultCopyright}
            </p>
          </AnimatedContainer>

          <div className="grid grid-cols-2 gap-12 md:grid-cols-4 xl:col-span-3">
            {columns.map((column, index) => (
              <AnimatedContainer
                key={`${column.label}-${index}`}
                delay={0.1 + index * 0.1}
                className="space-y-6"
              >
                <h3
                  className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-40"
                  style={{ color: linkColor, fontFamily: bodyFont }}
                >
                  {column.label}
                </h3>
                <ul className="space-y-4 text-sm font-medium">
                  {column.links.map((link, linkIndex) => (
                    <li key={`${link.title}-${link.href}-${linkIndex}`}>
                      {isEmbeddedPreview ? (
                        <span
                          className="group inline-flex items-center transition-all duration-300 opacity-60"
                          style={{ color: "inherit", fontFamily: bodyFont }}
                        >
                          {link.icon && (
                            <SocialIcon
                              name={link.icon}
                              className="w-4 h-4 mr-3 opacity-50"
                            />
                          )}
                          {link.title}
                        </span>
                      ) : (
                        <Link
                          href={link.href}
                          className="group inline-flex items-center transition-all duration-300 opacity-60 hover:opacity-100 hover:translate-x-2"
                          style={{ color: "inherit", fontFamily: bodyFont }}
                        >
                          {link.icon && (
                            <SocialIcon
                              name={link.icon}
                              className="w-4 h-4 mr-3 opacity-50 transition-opacity group-hover:opacity-100"
                            />
                          )}
                          {link.title}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </AnimatedContainer>
            ))}

            {showSocial && Object.values(socialLinks).some(Boolean) && (
              <AnimatedContainer delay={0.5} className="space-y-6">
                <h3
                  className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-40"
                  style={{ color: linkColor, fontFamily: bodyFont }}
                >
                  Redes Sociais
                </h3>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.facebook && (
                    <a
                      href={socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-3 transition-all hover:scale-110 hover:bg-white/10 border border-white/5 bg-white/5"
                      style={{
                        color: linkColor,
                      }}
                    >
                      <SocialIcon name="facebook" className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-3 transition-all hover:scale-110 hover:bg-white/10 border border-white/5 bg-white/5"
                      style={{
                        color: linkColor,
                      }}
                    >
                      <SocialIcon name="instagram" className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a
                      href={socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-3 transition-all hover:scale-110 hover:bg-white/10 border border-white/5 bg-white/5"
                      style={{
                        color: linkColor,
                      }}
                    >
                      <SocialIcon name="youtube" className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a
                      href={socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-3 transition-all hover:scale-110 hover:bg-white/10 border border-white/5 bg-white/5"
                      style={{
                        color: linkColor,
                      }}
                    >
                      <SocialIcon name="linkedin" className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.whatsapp && (
                    <a
                      href={socialLinks.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-3 transition-all hover:scale-110 hover:bg-white/10 border border-white/5 bg-white/5"
                      style={{
                        color: linkColor,
                      }}
                    >
                      <SocialIcon name="whatsapp" className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </AnimatedContainer>
            )}
          </div>
        </div>
      </div>
    </SectionSurface>
  );
}
