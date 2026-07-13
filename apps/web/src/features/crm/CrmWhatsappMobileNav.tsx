import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  CrmWhatsappScope,
  CrmWhatsappScopeOption,
} from "./CrmWhatsappScopedNav";

export function CrmWhatsappMobileNav({
  activeScope,
  badgeForScope,
  onChange,
  scopes,
}: {
  activeScope: CrmWhatsappScope;
  badgeForScope: (scope: CrmWhatsappScope) => string | null;
  onChange: (scope: CrmWhatsappScope) => void;
  scopes: readonly CrmWhatsappScopeOption[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const primaryScopes = scopes.filter((scope) =>
    primaryScopeIds.includes(scope.id),
  );
  const secondaryScopes = scopes.filter(
    (scope) => !primaryScopeIds.includes(scope.id),
  );
  const secondaryActive = secondaryScopes.some(
    (scope) => scope.id === activeScope,
  );

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const selectScope = (scope: CrmWhatsappScope) => {
    setMenuOpen(false);
    onChange(scope);
  };

  return (
    <nav
      aria-label="Navegação móvel do WhatsApp CRM"
      className="crm-whatsapp-mobile-nav"
    >
      <div className="crm-whatsapp-mobile-nav-shell">
        {primaryScopes.map((scope) => (
          <MobileNavItem
            active={activeScope === scope.id}
            badge={badgeForScope(scope.id)}
            key={scope.id}
            onClick={() => selectScope(scope.id)}
            scope={scope}
          />
        ))}
        <div className="crm-whatsapp-mobile-more" ref={menuRef}>
          <button
            aria-current={secondaryActive ? "page" : undefined}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={secondaryActive ? "is-active" : undefined}
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" />
            <span>Mais</span>
            {secondaryActive ? <ActiveIndicator /> : null}
          </button>
          {menuOpen ? (
            <div className="crm-whatsapp-mobile-more-menu" role="menu">
              {secondaryScopes.map((scope) => (
                <SecondaryNavItem
                  active={activeScope === scope.id}
                  badge={badgeForScope(scope.id)}
                  key={scope.id}
                  onClick={() => selectScope(scope.id)}
                  scope={scope}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

function MobileNavItem({
  active,
  badge,
  onClick,
  scope,
}: {
  active: boolean;
  badge: string | null;
  onClick: () => void;
  scope: CrmWhatsappScopeOption;
}) {
  const Icon = scope.icon;
  return (
    <button
      aria-label={scope.label}
      aria-current={active ? "page" : undefined}
      className={active ? "is-active" : undefined}
      onClick={onClick}
      type="button"
    >
      <span className="crm-whatsapp-mobile-nav-icon">
        <Icon aria-hidden="true" />
        {badge ? <small>{badge}</small> : null}
      </span>
      <span>{scope.id === "schedules" ? "Agendar" : scope.label}</span>
      {active ? <ActiveIndicator /> : null}
    </button>
  );
}

function SecondaryNavItem({
  active,
  badge,
  onClick,
  scope,
}: {
  active: boolean;
  badge: string | null;
  onClick: () => void;
  scope: CrmWhatsappScopeOption;
}) {
  const Icon = scope.icon;
  return (
    <button
      aria-current={active ? "page" : undefined}
      data-scope={scope.id}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <Icon aria-hidden="true" />
      <span>{scope.label}</span>
      {badge ? <small>{badge}</small> : null}
    </button>
  );
}

function ActiveIndicator() {
  return (
    <span aria-hidden="true" className="crm-whatsapp-mobile-nav-indicator" />
  );
}

const primaryScopeIds: CrmWhatsappScope[] = [
  "conversations",
  "schedules",
  "visits",
];
