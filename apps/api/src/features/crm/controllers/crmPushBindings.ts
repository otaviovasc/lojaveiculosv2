import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmPushSettings,
  CrmPushSubscriptionRegistrationResult,
} from "../../../domains/crm/ports/crmPushRepository.js";
import {
  disableCrmPushSubscription,
  getCrmPushSettings,
  registerCrmPushSubscription,
  setOwnCrmPushPreference,
} from "../../../domains/crm/services/CrmPushService/pushSettings.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";

export type CrmPushServices = {
  disableCrmPushSubscription: (
    context: ServiceContext,
    input: { subscriptionId: string },
  ) => Promise<{ disabled: boolean }>;
  getCrmPushSettings: (context: ServiceContext) => Promise<CrmPushSettings>;
  registerCrmPushSubscription: (
    context: ServiceContext,
    input: { subscriptionId: string },
  ) => Promise<CrmPushSubscriptionRegistrationResult>;
  setOwnCrmPushPreference: (
    context: ServiceContext,
    input: { enabled: boolean },
  ) => Promise<void>;
};

export function createCrmPushBindings(ports: CrmServicePorts): CrmPushServices {
  return {
    disableCrmPushSubscription: (context, input) =>
      disableCrmPushSubscription(context, input, ports),
    getCrmPushSettings: (context) => getCrmPushSettings(context, ports),
    registerCrmPushSubscription: (context, input) =>
      registerCrmPushSubscription(context, input, ports),
    setOwnCrmPushPreference: (context, input) =>
      setOwnCrmPushPreference(context, input, ports),
  };
}
