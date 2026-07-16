import { defineRailway, postgres, project, redis, service } from "railway/iac";

export default defineRailway((context) => {
  const appEnvironment = context.isEnvironment("production")
    ? "production"
    : "staging";
  const productDatabase = postgres("lojaveiculosv2-postgres");
  const auditDatabase = postgres("lojaveiculosv2-audit-postgres");
  const realtimeCache = redis("lojaveiculosv2-redis");

  const api = service("lojaveiculosv2-api", {
    build: "pnpm --filter @lojaveiculosv2/api build",
    env: {
      API_BASE_URL: context.shared.API_BASE_URL,
      API_PRIMARY_DOMAIN: context.shared.API_PRIMARY_DOMAIN,
      APP_ENV: appEnvironment,
      APP_PRIMARY_DOMAIN: context.shared.APP_PRIMARY_DOMAIN,
      ASAAS_API_KEY: context.shared.ASAAS_API_KEY,
      ASAAS_API_URL: context.shared.ASAAS_API_URL,
      ASAAS_BILLING_SYNC_TYPE: context.shared.ASAAS_BILLING_SYNC_TYPE,
      ASAAS_CHECKOUT_URL: context.shared.ASAAS_CHECKOUT_URL,
      ASAAS_RUNTIME_IMPLEMENTATION: context.shared.ASAAS_RUNTIME_IMPLEMENTATION,
      ASAAS_WEBHOOK_SECRET: context.shared.ASAAS_WEBHOOK_SECRET,
      ASAAS_WEBHOOK_URL: context.shared.ASAAS_WEBHOOK_URL,
      AUDIT_DATABASE_URL: auditDatabase.env.DATABASE_URL,
      AUDIT_DB_POOL_MAX: "2",
      CLERK_AFTER_SIGN_IN_URL: context.shared.CLERK_AFTER_SIGN_IN_URL,
      CLERK_AFTER_SIGN_UP_URL: context.shared.CLERK_AFTER_SIGN_UP_URL,
      CLERK_AUTHORIZED_PARTIES: context.shared.CLERK_AUTHORIZED_PARTIES,
      CLERK_INVITATION_REDIRECT_URL:
        context.shared.CLERK_INVITATION_REDIRECT_URL,
      CLERK_SECRET_KEY: context.shared.CLERK_SECRET_KEY,
      CLERK_SIGN_IN_URL: context.shared.CLERK_SIGN_IN_URL,
      CLERK_SIGN_UP_URL: context.shared.CLERK_SIGN_UP_URL,
      CRM_ZAPI_API_BASE_URL: context.shared.CRM_ZAPI_API_BASE_URL,
      CRM_ZAPI_CLIENT_TOKEN: context.shared.CRM_ZAPI_CLIENT_TOKEN,
      CRM_ZAPI_WEBHOOK_TOKEN: context.shared.CRM_ZAPI_WEBHOOK_TOKEN,
      DATABASE_URL: productDatabase.env.DATABASE_URL,
      DB_CLOSE_TIMEOUT_SECONDS: "5",
      DB_POOL_MAX: "3",
      EXTERNAL_API_RATE_LIMIT_PER_MINUTE: "120",
      HTTP_REQUEST_TIMEOUT_MS: "240000",
      LOG_LEVEL: "info",
      MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY:
        context.shared.MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY,
      NODE_ENV: "production",
      PUBLIC_APP_URL: context.shared.PUBLIC_APP_URL,
      PUBLIC_STOREFRONT_CUSTOM_DOMAIN_CNAME_TARGET:
        context.shared.PUBLIC_STOREFRONT_CUSTOM_DOMAIN_CNAME_TARGET,
      PUBLIC_STOREFRONT_ROOT_DOMAIN:
        context.shared.PUBLIC_STOREFRONT_ROOT_DOMAIN,
      R2_ACCESS_KEY_ID: context.shared.R2_ACCESS_KEY_ID,
      R2_BUCKET_NAME: context.shared.R2_BUCKET_NAME,
      R2_DOWNLOAD_URL_EXPIRES_SECONDS: "300",
      R2_ENDPOINT: context.shared.R2_ENDPOINT,
      R2_PUBLIC_BASE_URL: context.shared.R2_PUBLIC_BASE_URL,
      R2_REGION: "auto",
      R2_SECRET_ACCESS_KEY: context.shared.R2_SECRET_ACCESS_KEY,
      R2_UPLOAD_URL_EXPIRES_SECONDS: "900",
      READINESS_TIMEOUT_MS: "2000",
      REDIS_URL: realtimeCache.env.REDIS_URL,
      SHUTDOWN_TIMEOUT_MS: "10000",
      SPEDY_API_TOKEN: context.shared.SPEDY_API_TOKEN,
      SPEDY_API_URL: context.shared.SPEDY_API_URL,
      SPEDY_AUTH_HEADER: "Authorization",
      SPEDY_AUTH_SCHEME: "Bearer",
      SPEDY_CANCEL_PATH: context.shared.SPEDY_CANCEL_PATH,
      SPEDY_ISSUE_PATH: context.shared.SPEDY_ISSUE_PATH,
      SPEDY_RUNTIME_IMPLEMENTATION: context.shared.SPEDY_RUNTIME_IMPLEMENTATION,
      SPEDY_STATUS_PATH: context.shared.SPEDY_STATUS_PATH,
      SPEDY_WEBHOOK_SECRET: context.shared.SPEDY_WEBHOOK_SECRET,
    },
    healthcheck: "/ready",
    healthcheckTimeout: 300,
    start:
      "pnpm run db:migrate:deploy && pnpm --filter @lojaveiculosv2/api start",
  });

  const web = service("lojaveiculosv2-web", {
    build: "pnpm --filter @lojaveiculosv2/web build",
    env: {
      APP_ENV: appEnvironment,
      NODE_ENV: "production",
      VITE_API_BASE_URL: context.shared.VITE_API_BASE_URL,
      VITE_CLERK_PUBLISHABLE_KEY: context.shared.VITE_CLERK_PUBLISHABLE_KEY,
    },
    healthcheck: "/health",
    healthcheckTimeout: 120,
    start: "pnpm --filter @lojaveiculosv2/web start",
  });

  const crmScheduleWorker = service("lojaveiculosv2-crm-schedule-worker", {
    build: "pnpm --filter @lojaveiculosv2/api build",
    deploy: {
      cronSchedule: "*/5 * * * *",
      restartPolicyType: "NEVER",
    },
    env: {
      API_BASE_URL: api.env.API_BASE_URL,
      API_PRIMARY_DOMAIN: api.env.API_PRIMARY_DOMAIN,
      APP_ENV: appEnvironment,
      APP_PRIMARY_DOMAIN: api.env.APP_PRIMARY_DOMAIN,
      ASAAS_API_KEY: api.env.ASAAS_API_KEY,
      ASAAS_API_URL: api.env.ASAAS_API_URL,
      ASAAS_BILLING_SYNC_TYPE: api.env.ASAAS_BILLING_SYNC_TYPE,
      ASAAS_CHECKOUT_URL: api.env.ASAAS_CHECKOUT_URL,
      ASAAS_RUNTIME_IMPLEMENTATION: api.env.ASAAS_RUNTIME_IMPLEMENTATION,
      ASAAS_WEBHOOK_SECRET: api.env.ASAAS_WEBHOOK_SECRET,
      ASAAS_WEBHOOK_URL: api.env.ASAAS_WEBHOOK_URL,
      AUDIT_DATABASE_URL: auditDatabase.env.DATABASE_URL,
      AUDIT_DB_POOL_MAX: "1",
      CLERK_AFTER_SIGN_IN_URL: api.env.CLERK_AFTER_SIGN_IN_URL,
      CLERK_AFTER_SIGN_UP_URL: api.env.CLERK_AFTER_SIGN_UP_URL,
      CLERK_AUTHORIZED_PARTIES: api.env.CLERK_AUTHORIZED_PARTIES,
      CLERK_INVITATION_REDIRECT_URL: api.env.CLERK_INVITATION_REDIRECT_URL,
      CLERK_SECRET_KEY: api.env.CLERK_SECRET_KEY,
      CLERK_SIGN_IN_URL: api.env.CLERK_SIGN_IN_URL,
      CLERK_SIGN_UP_URL: api.env.CLERK_SIGN_UP_URL,
      CRM_WHATSAPP_SCHEDULE_BATCH_SIZE: "25",
      CRM_WHATSAPP_SCHEDULE_SCOPE_LIMIT: "100",
      CRM_ZAPI_API_BASE_URL: api.env.CRM_ZAPI_API_BASE_URL,
      CRM_ZAPI_CLIENT_TOKEN: api.env.CRM_ZAPI_CLIENT_TOKEN,
      CRM_ZAPI_WEBHOOK_TOKEN: api.env.CRM_ZAPI_WEBHOOK_TOKEN,
      DATABASE_URL: productDatabase.env.DATABASE_URL,
      DB_CLOSE_TIMEOUT_SECONDS: "5",
      DB_POOL_MAX: "2",
      EXTERNAL_API_RATE_LIMIT_PER_MINUTE:
        api.env.EXTERNAL_API_RATE_LIMIT_PER_MINUTE,
      HTTP_REQUEST_TIMEOUT_MS: api.env.HTTP_REQUEST_TIMEOUT_MS,
      LOG_LEVEL: api.env.LOG_LEVEL,
      MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY:
        api.env.MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY,
      NODE_ENV: "production",
      PUBLIC_APP_URL: api.env.PUBLIC_APP_URL,
      PUBLIC_STOREFRONT_CUSTOM_DOMAIN_CNAME_TARGET:
        api.env.PUBLIC_STOREFRONT_CUSTOM_DOMAIN_CNAME_TARGET,
      PUBLIC_STOREFRONT_ROOT_DOMAIN: api.env.PUBLIC_STOREFRONT_ROOT_DOMAIN,
      R2_ACCESS_KEY_ID: api.env.R2_ACCESS_KEY_ID,
      R2_BUCKET_NAME: api.env.R2_BUCKET_NAME,
      R2_DOWNLOAD_URL_EXPIRES_SECONDS: api.env.R2_DOWNLOAD_URL_EXPIRES_SECONDS,
      R2_ENDPOINT: api.env.R2_ENDPOINT,
      R2_PUBLIC_BASE_URL: api.env.R2_PUBLIC_BASE_URL,
      R2_REGION: api.env.R2_REGION,
      R2_SECRET_ACCESS_KEY: api.env.R2_SECRET_ACCESS_KEY,
      R2_UPLOAD_URL_EXPIRES_SECONDS: api.env.R2_UPLOAD_URL_EXPIRES_SECONDS,
      REDIS_URL: realtimeCache.env.REDIS_URL,
      SHUTDOWN_TIMEOUT_MS: "10000",
      SPEDY_API_TOKEN: api.env.SPEDY_API_TOKEN,
      SPEDY_API_URL: api.env.SPEDY_API_URL,
      SPEDY_AUTH_HEADER: api.env.SPEDY_AUTH_HEADER,
      SPEDY_AUTH_SCHEME: api.env.SPEDY_AUTH_SCHEME,
      SPEDY_CANCEL_PATH: api.env.SPEDY_CANCEL_PATH,
      SPEDY_ISSUE_PATH: api.env.SPEDY_ISSUE_PATH,
      SPEDY_RUNTIME_IMPLEMENTATION: api.env.SPEDY_RUNTIME_IMPLEMENTATION,
      SPEDY_STATUS_PATH: api.env.SPEDY_STATUS_PATH,
      SPEDY_WEBHOOK_SECRET: api.env.SPEDY_WEBHOOK_SECRET,
    },
    start: "pnpm run crm:whatsapp:schedule:process",
  });

  return project("respectful-respect", {
    resources: [
      productDatabase,
      auditDatabase,
      realtimeCache,
      api,
      web,
      crmScheduleWorker,
    ],
  });
});
