"use client";

import { cn } from "@/lib/utils";
import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SectionSurface } from "./SectionSurface";
import { formatCssFontStack } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface HeaderLink {
  title: string;
  href: string;
}

interface BuilderHeaderProps {
  links?: HeaderLink[];
  logoText?: string;
  sticky?: boolean;
  showContactButton?: boolean;
  contactButtonText?: string;
  contactButtonLink?: string;
  showSocial?: boolean;
  style?: ComponentStyleProps;
  config: StoreConfig;
  workspaceDisplayName?: string | null;
}

export function BuilderHeader({
  links = [],
  logoText,
  sticky = true,
  showContactButton = true,
  contactButtonText = "Fale Conosco",
  contactButtonLink = "#contato",
  showSocial = true,
  style,
  config,
  workspaceDisplayName,
}: BuilderHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayLogo =
    logoText?.trim() ||
    config.corretorName?.trim() ||
    workspaceDisplayName ||
    "Minha Imobiliária";

  const resolvedTextColor =
    style?.textColor || defaultTextColorForTextBlock(style);
  const accentColor = config.accentColor || "#C9A84C";
  const headingFont = formatCssFontStack(
    style?.fontFamily || config.fonts?.heading,
  );
  const bodyFont = formatCssFontStack(style?.fontFamily || config.fonts?.body);

  const socialLinks = config.socialLinks || {};

  // Social icons definitions
  const socialIcons: Record<string, React.ReactNode> = {
    facebook: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
    instagram: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" />
      </svg>
    ),
    youtube: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
        <polygon
          points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"
          fill="white"
        />
      </svg>
    ),
    linkedin: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    whatsapp: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  };

  const socialLinksList = Object.entries(socialLinks)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([network, url]) => ({
      network,
      url:
        network === "whatsapp" && !url.startsWith("http")
          ? `https://wa.me/${url.replace(/\D/g, "")}`
          : url,
      icon: socialIcons[network],
    }));

  return (
    <div
      className={cn(
        "w-full transition-all duration-300",
        sticky ? "sticky top-0 z-50 backdrop-blur-md shadow-sm" : "relative",
      )}
      style={{ fontFamily: bodyFont }}
    >
      <SectionSurface style={style} className="px-6 py-4 md:px-12">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          {/* Logo Area */}
          <div className="flex items-center">
            <span
              className="text-xl font-black tracking-tighter"
              style={{ color: resolvedTextColor, fontFamily: headingFont }}
            >
              {displayLogo}
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className="text-sm font-medium hover:opacity-85 transition-opacity"
                style={{ color: resolvedTextColor }}
              >
                {link.title}
              </a>
            ))}
          </nav>

          {/* Desktop CTA & Social Icons */}
          <div className="hidden md:flex items-center gap-6">
            {showSocial && socialLinksList.length > 0 && (
              <div
                className="flex items-center gap-3"
                style={{ color: resolvedTextColor }}
              >
                {socialLinksList.map((soc, idx) => (
                  <a
                    key={idx}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                    title={soc.network}
                  >
                    {soc.icon}
                  </a>
                ))}
              </div>
            )}

            {showContactButton && (
              <a
                href={contactButtonLink}
                className="rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:shadow-lg transition-all duration-200"
                style={{ backgroundColor: accentColor }}
              >
                {contactButtonText}
              </a>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-1 rounded-lg"
            style={{ color: resolvedTextColor }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-border/20 space-y-4">
            <nav className="flex flex-col gap-3">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  className="text-sm font-medium py-1 hover:opacity-85 transition-opacity"
                  style={{ color: resolvedTextColor }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.title}
                </a>
              ))}
            </nav>

            <div className="flex flex-col gap-4 pt-2">
              {showSocial && socialLinksList.length > 0 && (
                <div
                  className="flex items-center gap-4"
                  style={{ color: resolvedTextColor }}
                >
                  {socialLinksList.map((soc, idx) => (
                    <a
                      key={idx}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80 transition-opacity"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {soc.icon}
                    </a>
                  ))}
                </div>
              )}

              {showContactButton && (
                <a
                  href={contactButtonLink}
                  className="rounded-full text-center px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:shadow-lg transition-all duration-200 w-full block"
                  style={{ backgroundColor: accentColor }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {contactButtonText}
                </a>
              )}
            </div>
          </div>
        )}
      </SectionSurface>
    </div>
  );
}
