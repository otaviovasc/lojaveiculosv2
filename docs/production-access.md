# Production Access Rules

Render, Railway, and production databases are live systems.

## Allowed By Default

- Read service topology.
- Read deployment status.
- Read aggregate metrics.
- Read recent logs with sensitive values redacted or summarized.
- Read schema metadata and table/index names.
- Read counts and query plans when no customer payload is exposed.

## Not Allowed Without Explicit User Approval

- Updating environment variables.
- Deploying or rolling back services.
- Scaling services.
- Running database writes.
- Dumping customer rows, messages, documents, tokens, or full environment
  values.
- Removing services, volumes, buckets, domains, or databases.
- Running migration or profiling scripts against production hosts.
- Creating production dumps from this workspace.

## Reporting

When production data is needed, report summaries and identifiers only. Do not
paste secrets, personal data, message bodies, full vehicle documents, payment
payloads, or raw webhook payloads into chat or committed files.

## Migration Profiling

Migration profiling is local-dump only. Approved operators may produce a dump
outside this repo, then the local profiler can read that file without production
credentials:

```bash
node tools/migration/profile-local-dump.mjs /path/to/local-v1.dump.sql
```

Do not commit dump files, profiler outputs containing customer-derived
statistics, credentials, `.pgpass` files, or raw customer payload exports.
