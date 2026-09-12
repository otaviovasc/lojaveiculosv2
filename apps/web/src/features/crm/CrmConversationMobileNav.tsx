import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { CrmScope, CrmScopeOption } from "./CrmScopedNav";

export function CrmConversationMobileNav({
  activeScope,
  badgeForScope,
  onChange,
  scopes,
}: {
  activeScope: CrmScope;
  badgeForScope: (scope: CrmScope) => string | null;
  onChange: (scope: CrmScope) => void;
  scopes: readonly CrmScopeOption[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const disclosureId = useId();
  const disclosureRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
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
    if (!menuOpen) return undefined;

    const closeOutside = (event: PointerEvent) => {
      if (!disclosureRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      moreButtonRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const selectScope = (scope: CrmScope) => {
    setMenuOpen(false);
    onChange(scope);
  };

  return (
    <nav
      aria-label="Navegação móvel do WhatsApp CRM"
      className="crm-mobile-nav"
    >
      <div className="crm-mobile-nav-shell">
        {primaryScopes.map((scope) => (
          <MobileNavItem
            active={activeScope === scope.id}
            badge={badgeForScope(scope.id)}
            key={scope.id}
            onClick={() => selectScope(scope.id)}
            scope={scope}
          />
        ))}
        <div className="crm-mobile-more" ref={disclosureRef}>
          <button
            aria-current={secondaryActive ? "page" : undefined}
            aria-controls={disclosureId}
            aria-expanded={menuOpen}
            className={secondaryActive ? "is-active" : undefined}
            onClick={() => setMenuOpen((open) => !open)}
            ref={moreButtonRef}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" />
            <span>Mais</span>
            {secondaryActive ? <ActiveIndicator /> : null}
          </button>
          {menuOpen ? (
            <div
              aria-label="Outras áreas do CRM"
              className="crm-mobile-more-menu"
              id={disclosureId}
              role="group"
            >
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
  scope: CrmScopeOption;
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
      <span className="crm-mobile-nav-icon">
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
  scope: CrmScopeOption;
}) {
  const Icon = scope.icon;
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={active ? "is-active" : undefined}
      data-scope={scope.id}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" />
      <span>{scope.label}</span>
      {badge ? <small>{badge}</small> : null}
    </button>
  );
}

function ActiveIndicator() {
  return <span aria-hidden="true" className="crm-mobile-nav-indicator" />;
}

const primaryScopeIds: CrmScope[] = ["conversations", "schedules", "visits"];
