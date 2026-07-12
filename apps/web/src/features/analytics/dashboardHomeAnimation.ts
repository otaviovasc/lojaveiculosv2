import type { ModuleId } from "../../app/modules";

export type DashboardResource = {
  desc: string;
  panelClass: string;
  tag: string;
  title: string;
  imagePath: string;
  buttonLabel: string;
};

export type DashboardQuickAction = {
  id: DashboardQuickActionId;
  label: string;
};

export type DashboardQuickActionId = Extract<
  ModuleId,
  "customers" | "documents" | "inventory" | "reports"
>;

export type DashboardContentEntryOptions = {
  direction?: "horizontal" | "vertical";
  distance?: number;
  duration?: number;
  ease?: string;
  reverse?: boolean;
  threshold?: number;
};

export const DASHBOARD_RESOURCE_CYCLE_MS = 5000;
export const DASHBOARD_ENTRY_DELAY_SCALE = 0.35;
export const DASHBOARD_ENTRY_DURATION = 0.18;
export const DASHBOARD_ENTRY_INITIAL = { opacity: 0, y: 8 };
export const DASHBOARD_ENTRY_ANIMATE = { opacity: 1, y: 0 };
export const DASHBOARD_KPI_ENTRY_DELAY_STEP = 0.04;
export const DASHBOARD_CONTENT_ENTRY_DISTANCE = 20;
export const DASHBOARD_CONTENT_ENTRY_DURATION = 0.6;
export const DASHBOARD_CONTENT_ENTRY_EASE = "power2.out";
export const DASHBOARD_CONTENT_ENTRY_THRESHOLD = 0.1;
export const DASHBOARD_KPI_ENTRY_DISTANCE = DASHBOARD_CONTENT_ENTRY_DISTANCE;
export const DASHBOARD_KPI_ENTRY_DURATION = DASHBOARD_CONTENT_ENTRY_DURATION;
export const DASHBOARD_KPI_ENTRY_EASE = DASHBOARD_CONTENT_ENTRY_EASE;
export const DASHBOARD_RESOURCE_PRESENCE_INITIAL = false;
export const DASHBOARD_RESOURCE_PRESENCE_MODE = "sync";
export const DASHBOARD_RESOURCE_SLIDE_CLASS =
  "absolute inset-0 flex flex-col justify-between p-6";
export const DASHBOARD_RESOURCE_SLIDE_TRANSITION = {
  duration: 0.4,
  ease: "easeOut" as const,
};

export const dashboardResources: readonly DashboardResource[] = [
  {
    desc: "Sincronize seu estoque automaticamente com os maiores portais e ERPs do Brasil. Ganhe agilidade e elimine o erro humano com integração total via API.",
    panelClass: "dashboard-resource-api",
    tag: "Agilidade",
    title: "Estoque via API (Portais)",
    imagePath: "/carousel/estoque.png",
    buttonLabel: "Integrar estoque",
  },
  {
    desc: "Atraia centenas de novos leads qualificados todos os dias com campanhas estratégicas no Facebook, Instagram e Google Ads.",
    panelClass: "dashboard-resource-marketing",
    tag: "Conversão",
    title: "Marketing e Tráfego Pago",
    imagePath: "/carousel/marketing.png",
    buttonLabel: "Impulsionar resultados",
  },
  {
    desc: "Personalize cores, banners e vitrines para criar uma experiência de compra única que reflita o valor da sua marca.",
    panelClass: "dashboard-resource-design",
    tag: "Exclusividade",
    title: "Design & Personalização",
    imagePath: "/carousel/design.png",
    buttonLabel: "Personalizar vitrine",
  },
];

const fallbackDashboardResource: DashboardResource = {
  desc: "Sincronize seu estoque automaticamente com os maiores portais e ERPs do Brasil. Ganhe agilidade e elimine o erro humano com integração total via API.",
  panelClass: "dashboard-resource-api",
  tag: "Agilidade",
  title: "Estoque via API (Portais)",
  imagePath: "/carousel/estoque.png",
  buttonLabel: "Integrar estoque",
};

export const dashboardQuickActions: readonly DashboardQuickAction[] = [
  { id: "inventory", label: "Ver Estoque" },
  { id: "customers", label: "CRM Leads" },
  { id: "documents", label: "Documentos" },
  { id: "reports", label: "Relatórios" },
];

const transitionCache = new Map<
  number,
  {
    delay: number;
    duration: number;
    ease: "linear";
    type: "tween";
  }
>();

const motionCache = new Map<
  number,
  {
    animate: typeof DASHBOARD_ENTRY_ANIMATE;
    initial: typeof DASHBOARD_ENTRY_INITIAL;
    transition: ReturnType<typeof getDashboardEntryTransition>;
  }
>();

export function getDashboardEntryTransition(delay: number) {
  let cached = transitionCache.get(delay);
  if (!cached) {
    cached = {
      delay: delay * DASHBOARD_ENTRY_DELAY_SCALE,
      duration: DASHBOARD_ENTRY_DURATION,
      ease: "linear" as const,
      type: "tween" as const,
    };
    transitionCache.set(delay, cached);
  }
  return cached;
}

export function getDashboardEntryMotion(delay: number) {
  let cached = motionCache.get(delay);
  if (!cached) {
    cached = {
      animate: DASHBOARD_ENTRY_ANIMATE,
      initial: DASHBOARD_ENTRY_INITIAL,
      transition: getDashboardEntryTransition(delay),
    };
    motionCache.set(delay, cached);
  }
  return cached;
}

export function getDashboardContentEntryConfig(
  delay: number,
  options: DashboardContentEntryOptions = {},
) {
  return {
    delay,
    direction: options.direction ?? "vertical",
    distance: options.distance ?? DASHBOARD_CONTENT_ENTRY_DISTANCE,
    duration: options.duration ?? DASHBOARD_CONTENT_ENTRY_DURATION,
    ease: options.ease ?? DASHBOARD_CONTENT_ENTRY_EASE,
    reverse: options.reverse ?? false,
    threshold: options.threshold ?? DASHBOARD_CONTENT_ENTRY_THRESHOLD,
  };
}

export function getNextDashboardResourceIndex(current: number, total: number) {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

export function getDashboardResource(index: number) {
  return dashboardResources[index] ?? fallbackDashboardResource;
}
