export type CrmPushDeliveryMode = "live" | "off" | "shadow";

export type CrmPushSettings = {
  appId: string | null;
  deliveryMode: CrmPushDeliveryMode;
  preference: { enabled: boolean };
  subscription: { enabled: boolean; id: string } | null;
};

export type CrmPushStatus =
  | "blocked"
  | "default"
  | "degraded"
  | "disabled"
  | "enabled"
  | "requesting"
  | "saving"
  | "unsupported";

export type BrowserPushSnapshot = {
  optedIn: boolean;
  permission: NotificationPermission;
  subscriptionId: string | null;
};

export type CrmPushBrowserCallbacks = {
  onSubscriptionChange: () => void;
  shouldSuppressForeground: (cycleId: string | null) => boolean;
};

export type CrmPushBrowser = {
  getSnapshot: () => BrowserPushSnapshot;
  initialize: (
    appId: string,
    callbacks: CrmPushBrowserCallbacks,
  ) => Promise<void>;
  isSupported: () => boolean;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  optIn: () => Promise<void>;
  optOut: () => Promise<void>;
  requestPermission: () => Promise<void>;
  waitForSubscriptionId: (timeoutMs?: number) => Promise<string>;
};

export type CrmPushView = {
  activate: () => Promise<void>;
  available: boolean;
  error: string | null;
  preferenceEnabled: boolean;
  refresh: () => Promise<void>;
  setPreferenceEnabled: (enabled: boolean) => Promise<void>;
  status: CrmPushStatus;
};
