import {
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  redis,
  service,
} from "railway/iac";

export default defineRailway((context) => {
  const appEnvironment = context.isEnvironment("production")
    ? "production"
    : "staging";
  // Each environment auto-deploys from its own branch: staging <- staging,
  // production <- main. Pushing to the branch triggers the Railway deploy.
  const appSource = github("otaviovasc/lojaveiculosv2", {
    branch: context.isEnvironment("production") ? "main" : "staging",
  });
  const productDatabase = postgres("lojaveiculosv2-postgres");
  const auditDatabase = postgres("lojaveiculosv2-audit-postgres");
  const realtimeCache = redis("lojaveiculosv2-redis");

  const api = service("lojaveiculosv2-api", {
    source: appSource,
    build: "pnpm --filter @lojaveiculosv2/api build",
    deploy: { overlapSeconds: 0 },
    env: {
      API_BASE_URL: context.shared.API_BASE_URL,
      API_PLACA_KEY: context.shared.API_PLACA_KEY,
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
      COMPOSIO_API_BASE_URL: context.shared.COMPOSIO_API_BASE_URL,
      COMPOSIO_API_KEY: context.shared.COMPOSIO_API_KEY,
      COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID: preserve(),
      COMPOSIO_INSTAGRAM_LOGIN_MODE: preserve(),
      COMPOSIO_META_GRAPH_VERSION: context.shared.COMPOSIO_META_GRAPH_VERSION,
      COMPOSIO_REQUEST_TIMEOUT_MS: context.shared.COMPOSIO_REQUEST_TIMEOUT_MS,
      COMPOSIO_WHATSAPP_AUTH_CONFIG_ID:
        context.shared.COMPOSIO_WHATSAPP_AUTH_CONFIG_ID,
      CREDERE_CLIENT_ID: context.shared.CREDERE_CLIENT_ID,
      CREDERE_CLIENT_SECRET: context.shared.CREDERE_CLIENT_SECRET,
      CREDERE_CREDENTIAL_ENCRYPTION_KEY:
        context.shared.CREDERE_CREDENTIAL_ENCRYPTION_KEY,
      CREDERE_REDIRECT_URI: context.shared.CREDERE_REDIRECT_URI,
      CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY: preserve(),
      CRM_OLX_CHAT_ENABLED: context.shared.CRM_OLX_CHAT_ENABLED,
      CRM_OLX_TRUST_PROXY_HEADERS: "true",
      CRM_OLX_WEBHOOK_ALLOWED_IPS: "54.162.151.93",
      CRM_META_APP_SECRET: context.shared.CRM_META_APP_SECRET,
      CRM_META_WEBHOOK_VERIFY_TOKEN:
        context.shared.CRM_META_WEBHOOK_VERIFY_TOKEN,
      CRM_ZAPI_API_BASE_URL: context.shared.CRM_ZAPI_API_BASE_URL,
      CRM_ZAPI_CLIENT_TOKEN: context.shared.CRM_ZAPI_CLIENT_TOKEN,
      DATABASE_URL: productDatabase.env.DATABASE_URL,
      DB_CLOSE_TIMEOUT_SECONDS: "5",
      DB_POOL_MAX: "3",
      EXTERNAL_API_RATE_LIMIT_PER_MINUTE: "120",
      HTTP_REQUEST_TIMEOUT_MS: "240000",
      LOG_LEVEL: "info",
      MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY:
        context.shared.MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY,
      MERCADO_LIVRE_ACCOUNT_PATH: context.shared.MERCADO_LIVRE_ACCOUNT_PATH,
      MERCADO_LIVRE_API_BASE_URL: context.shared.MERCADO_LIVRE_API_BASE_URL,
      MERCADO_LIVRE_AUTHORIZATION_URL:
        context.shared.MERCADO_LIVRE_AUTHORIZATION_URL,
      MERCADO_LIVRE_CLIENT_ID: context.shared.MERCADO_LIVRE_CLIENT_ID,
      MERCADO_LIVRE_CLIENT_SECRET: context.shared.MERCADO_LIVRE_CLIENT_SECRET,
      MERCADO_LIVRE_TOKEN_URL: context.shared.MERCADO_LIVRE_TOKEN_URL,
      NODE_ENV: "production",
      OPENROUTER_API_KEY: context.shared.OPENROUTER_API_KEY,
      OPENROUTER_DEFAULT_MODEL: context.shared.OPENROUTER_DEFAULT_MODEL,
      OPENROUTER_DOCUMENTS_MODEL: context.shared.OPENROUTER_DOCUMENTS_MODEL,
      OPENROUTER_INVENTORY_RESALE_MODEL:
        context.shared.OPENROUTER_INVENTORY_RESALE_MODEL,
      OLX_CLIENT_ID: context.shared.OLX_CLIENT_ID,
      OLX_CLIENT_SECRET: context.shared.OLX_CLIENT_SECRET,
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
      FISCAL_CREDENTIAL_ENCRYPTION_KEY:
        context.shared.FISCAL_CREDENTIAL_ENCRYPTION_KEY,
      SPEDY_API_URL: context.shared.SPEDY_API_URL,
      SPEDY_OWNER_API_KEY: context.shared.SPEDY_OWNER_API_KEY,
      SPEDY_RUNTIME_IMPLEMENTATION: context.shared.SPEDY_RUNTIME_IMPLEMENTATION,
      SPEDY_WEBHOOK_URL: context.shared.SPEDY_WEBHOOK_URL,
    },
    healthcheck: "/ready",
    healthcheckTimeout: 300,
    start:
      "pnpm run db:migrate:deploy && pnpm run billing:catalog:reconcile && pnpm --filter @lojaveiculosv2/api start",
  });

  const web = service("lojaveiculosv2-web", {
    source: appSource,
    build: "pnpm --filter @lojaveiculosv2/web build",
    env: {
      APP_ENV: appEnvironment,
      NODE_ENV: "production",
      VITE_API_BASE_URL: api.env.API_BASE_URL,
      VITE_CLERK_PUBLISHABLE_KEY: context.shared.VITE_CLERK_PUBLISHABLE_KEY,
    },
    healthcheck: "/health",
    healthcheckTimeout: 120,
    start: "pnpm --filter @lojaveiculosv2/web start",
  });

  const crmScheduleWorker = service("lojaveiculosv2-crm-schedule-worker", {
    source: appSource,
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
      COMPOSIO_API_BASE_URL: api.env.COMPOSIO_API_BASE_URL,
      COMPOSIO_API_KEY: api.env.COMPOSIO_API_KEY,
      COMPOSIO_META_GRAPH_VERSION: api.env.COMPOSIO_META_GRAPH_VERSION,
      COMPOSIO_REQUEST_TIMEOUT_MS: api.env.COMPOSIO_REQUEST_TIMEOUT_MS,
      CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY:
        api.env.CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY,
      CRM_OLX_CHAT_ENABLED: api.env.CRM_OLX_CHAT_ENABLED,
      CRM_WHATSAPP_SCHEDULE_BATCH_SIZE: "25",
      CRM_WHATSAPP_SCHEDULE_SCOPE_LIMIT: "100",
      CRM_ZAPI_API_BASE_URL: api.env.CRM_ZAPI_API_BASE_URL,
      CRM_ZAPI_CLIENT_TOKEN: api.env.CRM_ZAPI_CLIENT_TOKEN,
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
      SPEDY_API_URL: api.env.SPEDY_API_URL,
      SPEDY_RUNTIME_IMPLEMENTATION: api.env.SPEDY_RUNTIME_IMPLEMENTATION,
    },
    start: "pnpm run crm:schedule:process",
  });

  const billingReconciliationWorker = service(
    "lojaveiculosv2-billing-reconciliation-worker",
    {
      source: appSource,
      build: "pnpm --filter @lojaveiculosv2/api build",
      deploy: {
        cronSchedule: "*/5 * * * *",
        restartPolicyType: "NEVER",
      },
      env: {
        APP_ENV: appEnvironment,
        ASAAS_API_KEY: api.env.ASAAS_API_KEY,
        ASAAS_API_URL: api.env.ASAAS_API_URL,
        ASAAS_CHECKOUT_URL: api.env.ASAAS_CHECKOUT_URL,
        ASAAS_RUNTIME_IMPLEMENTATION: api.env.ASAAS_RUNTIME_IMPLEMENTATION,
        ASAAS_WEBHOOK_SECRET: api.env.ASAAS_WEBHOOK_SECRET,
        ASAAS_WEBHOOK_URL: api.env.ASAAS_WEBHOOK_URL,
        AUDIT_DATABASE_URL: auditDatabase.env.DATABASE_URL,
        DATABASE_URL: productDatabase.env.DATABASE_URL,
        DB_POOL_MAX: "2",
        LOG_LEVEL: api.env.LOG_LEVEL,
        NODE_ENV: "production",
        PUBLIC_APP_URL: api.env.PUBLIC_APP_URL,
      },
      start: "pnpm run billing:asaas:reconcile",
    },
  );

  const marketplaceReconciliationWorker = service(
    "lojaveiculosv2-marketplace-reconciliation-worker",
    {
      source: appSource,
      build: "pnpm --filter @lojaveiculosv2/api build",
      deploy: {
        cronSchedule: "*/5 * * * *",
        restartPolicyType: "NEVER",
      },
      env: {
        APP_ENV: appEnvironment,
        AUDIT_DATABASE_URL: auditDatabase.env.DATABASE_URL,
        AUDIT_DB_POOL_MAX: "1",
        DATABASE_URL: productDatabase.env.DATABASE_URL,
        DB_CLOSE_TIMEOUT_SECONDS: "5",
        DB_POOL_MAX: "2",
        LOG_LEVEL: api.env.LOG_LEVEL,
        MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY:
          api.env.MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY,
        MARKETPLACE_JOB_BATCH_SIZE: "25",
        MARKETPLACE_JOB_SCOPE_LIMIT: "100",
        MERCADO_LIVRE_ACCOUNT_PATH: api.env.MERCADO_LIVRE_ACCOUNT_PATH,
        MERCADO_LIVRE_API_BASE_URL: api.env.MERCADO_LIVRE_API_BASE_URL,
        MERCADO_LIVRE_CLIENT_ID: api.env.MERCADO_LIVRE_CLIENT_ID,
        MERCADO_LIVRE_CLIENT_SECRET: api.env.MERCADO_LIVRE_CLIENT_SECRET,
        MERCADO_LIVRE_TOKEN_URL: api.env.MERCADO_LIVRE_TOKEN_URL,
        NODE_ENV: "production",
        OLX_CLIENT_ID: api.env.OLX_CLIENT_ID,
        OLX_CLIENT_SECRET: api.env.OLX_CLIENT_SECRET,
      },
      start: "pnpm --filter @lojaveiculosv2/api marketplace:jobs:process",
    },
  );

  const crmRetentionWorker = service("lojaveiculosv2-crm-retention-worker", {
    source: appSource,
    build: "pnpm --filter @lojaveiculosv2/api build",
    deploy: {
      cronSchedule: "17 * * * *",
      restartPolicyType: "NEVER",
    },
    env: {
      APP_ENV: appEnvironment,
      AUDIT_DATABASE_URL: auditDatabase.env.DATABASE_URL,
      CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY:
        api.env.CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY,
      CRM_RETENTION_BATCH_SIZE: "100",
      CRM_RETENTION_DRY_RUN: "true",
      CRM_RETENTION_LEASE_SECONDS: "900",
      CRM_RETENTION_MAX_BATCHES: "20",
      CRM_RETENTION_SCOPE_LIMIT: "100",
      DATABASE_URL: productDatabase.env.DATABASE_URL,
      LOG_LEVEL: api.env.LOG_LEVEL,
      NODE_ENV: "production",
    },
    start: "pnpm --filter @lojaveiculosv2/api crm:retention:process",
  });

  return project("respectful-respect", {
    resources: [
      productDatabase,
      auditDatabase,
      realtimeCache,
      api,
      web,
      crmScheduleWorker,
      billingReconciliationWorker,
      marketplaceReconciliationWorker,
      crmRetentionWorker,
    ],
  });
});
