export const safeTokens = `
  :root {
    --color-app: #f4efee;
    --color-panel: #ffffff;
    --color-text: #151515;
    --color-accent: #e11f26;
    --color-accent-strong: #b81820;
    --color-accent-contrast: #ffffff;
    --color-accent-strong-contrast: #ffffff;
    --color-inverse: #ffffff;
    --color-primary: #151515;
    --color-primary-contrast: #ffffff;
    --color-success: #18b841;
    --color-success-contrast: #151515;
    --color-success-soft-foreground: #066525;
    --color-green-soft: rgb(24 184 65 / 0.08);
    --color-warning: #b89418;
    --color-warning-contrast: #151515;
    --color-accent-soft: #fce8e9;
    --color-accent-soft-foreground: #151515;
    --color-app-elevated: #e8e3e2;
    --color-danger: #b81820;
    --color-blue-soft: rgb(24 42 184 / 0.08);
    --color-info-soft-foreground: #182ab8;
  }
  :root[data-theme="dark"] {
    --color-app: #151515;
    --color-app-elevated: #4a4444;
    --color-panel: #2a2424;
    --color-text: #f4efee;
    --color-primary: #f4efee;
    --color-primary-contrast: #151515;
    --color-success-soft-foreground: #f4efee;
    --color-info-soft-foreground: #f4efee;
  }
  @theme {
    --color-background: var(--color-app);
    --color-foreground: var(--color-text);
    --color-card: var(--color-panel);
    --color-card-foreground: var(--color-text);
    --color-popover: var(--color-panel);
    --color-popover-foreground: var(--color-text);
    --color-primary: var(--color-primary);
    --color-primary-foreground: var(--color-primary-contrast);
    --color-accent-foreground: var(--color-accent-contrast);
    --color-accent-strong-foreground: var(--color-accent-strong-contrast);
    --color-secondary: var(--color-app-elevated);
    --color-secondary-foreground: var(--color-text);
    --color-destructive: var(--color-danger);
    --color-destructive-foreground: var(--color-inverse);
    --color-success: var(--color-success);
    --color-success-foreground: var(--color-success-contrast);
    --color-warning: var(--color-warning);
    --color-warning-foreground: var(--color-warning-contrast);
    --color-accent-soft: var(--color-accent-soft);
    --color-accent-soft-foreground: var(--color-accent-soft-foreground);
  }
`;
