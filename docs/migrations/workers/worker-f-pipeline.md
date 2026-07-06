# Worker F - CRM Pipeline Persistence

## Implementation Note

- Add store-scoped `crm_pipelines` and `crm_pipeline_stages` schema, plus
  lead-owned `pipeline_id` and `pipeline_stage_id` references on `leads`.
- Keep pipeline business mutations in CRM domain services with explicit
  `ServiceContext`, `crm.pipeline.*` permission checks, and audit events.
- Expose the V2 contracts under `/api/v1/crm/pipelines` and
  `/api/v1/crm/leads/:leadId/pipeline-stage`, using existing CRM error
  mapping.
- Replace browser-local pipeline persistence with frontend API calls while
  keeping local active-pipeline selection and metadata stage fallback only as a
  read compatibility path.
- Verify with focused API/frontend tests, API and web typechecks, and the line
  length guardrail before committing.
