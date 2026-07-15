-- Local product seed v2.
-- Preview-only inspection reviews. Approval is a recorded review, never execution.
-- Included by ../product-test-user.sql inside one transaction.

INSERT INTO automation_runs (
  id, context, created_at, created_by_actor_id, execution_enabled, objective,
  status, store_id, tenant_id, updated_at, version
)
VALUES
  (
    '85000000-0000-4000-8000-000000000001',
    '{"module": "inventory.inspection", "resourceId": "11000000-0000-4000-8000-000000000005"}'::jsonb,
    now() - interval '30 minutes',
    'clerk_seed_salesman',
    false,
    'Revisar os dados de inspecao da BMW M3 verde antes da publicacao',
    'awaiting_approval',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    now() - interval '30 minutes',
    1
  ),
  (
    '85000000-0000-4000-8000-000000000002',
    '{"module": "inventory.inspection", "resourceId": "11000000-0000-4000-8000-000000000003"}'::jsonb,
    now() - interval '2 days',
    'clerk_seed_salesman',
    false,
    'Revisar as pendencias de inspecao do Hyundai HB20 reservado',
    'rejected',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    now() - interval '1 day 23 hours',
    2
  ),
  (
    '85000000-0000-4000-8000-000000000003',
    '{"module": "inventory.inspection", "resourceId": "11000000-0000-4000-8000-000000000001"}'::jsonb,
    now() - interval '4 days',
    'clerk_seed_supervisor',
    false,
    'Revisar o resumo da inspecao concluida do Audi A4',
    'approved',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    now() - interval '3 days 23 hours',
    2
  )
ON CONFLICT (id) DO UPDATE SET
  context = EXCLUDED.context,
  created_at = EXCLUDED.created_at,
  created_by_actor_id = EXCLUDED.created_by_actor_id,
  execution_enabled = false,
  objective = EXCLUDED.objective,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = EXCLUDED.updated_at,
  version = EXCLUDED.version;

INSERT INTO automation_steps (
  id, created_at, execution_enabled, kind, position, risk, run_id, status,
  store_id, summary, tenant_id, title, updated_at, version
)
VALUES
  (
    '85100000-0000-4000-8000-000000000001',
    now() - interval '30 minutes',
    false,
    'read_only_preview',
    1,
    'low',
    '85000000-0000-4000-8000-000000000001',
    'awaiting_approval',
    '66666666-6666-4666-8666-666666666666',
    'Preparar uma análise somente leitura para: Revisar os dados de inspecao da BMW M3 verde antes da publicacao. Nenhuma ferramenta ou alteração será executada nesta versão.',
    '77777777-7777-4777-8777-777777777777',
    'Revisar plano somente leitura',
    now() - interval '30 minutes',
    1
  ),
  (
    '85100000-0000-4000-8000-000000000002',
    now() - interval '2 days',
    false,
    'read_only_preview',
    1,
    'low',
    '85000000-0000-4000-8000-000000000002',
    'rejected',
    '66666666-6666-4666-8666-666666666666',
    'Preparar uma análise somente leitura para: Revisar as pendencias de inspecao do Hyundai HB20 reservado. Nenhuma ferramenta ou alteração será executada nesta versão.',
    '77777777-7777-4777-8777-777777777777',
    'Revisar plano somente leitura',
    now() - interval '1 day 23 hours',
    2
  ),
  (
    '85100000-0000-4000-8000-000000000003',
    now() - interval '4 days',
    false,
    'read_only_preview',
    1,
    'low',
    '85000000-0000-4000-8000-000000000003',
    'approved',
    '66666666-6666-4666-8666-666666666666',
    'Preparar uma análise somente leitura para: Revisar o resumo da inspecao concluida do Audi A4. Nenhuma ferramenta ou alteração será executada nesta versão.',
    '77777777-7777-4777-8777-777777777777',
    'Revisar plano somente leitura',
    now() - interval '3 days 23 hours',
    2
  )
ON CONFLICT (id) DO UPDATE SET
  created_at = EXCLUDED.created_at,
  execution_enabled = false,
  kind = EXCLUDED.kind,
  position = EXCLUDED.position,
  risk = EXCLUDED.risk,
  run_id = EXCLUDED.run_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  summary = EXCLUDED.summary,
  tenant_id = EXCLUDED.tenant_id,
  title = EXCLUDED.title,
  updated_at = EXCLUDED.updated_at,
  version = EXCLUDED.version;

INSERT INTO automation_approvals (
  id, created_at, decided_at, decided_by_actor_id, proposal_digest, run_id,
  status, step_id, store_id, tenant_id, updated_at, version
)
VALUES
  (
    '85200000-0000-4000-8000-000000000001',
    now() - interval '30 minutes',
    null,
    null,
    '92d2f7629addc8b7763f51ae179c7272bb436227873634711cf6e3a47a744122',
    '85000000-0000-4000-8000-000000000001',
    'pending',
    '85100000-0000-4000-8000-000000000001',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    now() - interval '30 minutes',
    1
  ),
  (
    '85200000-0000-4000-8000-000000000002',
    now() - interval '2 days',
    now() - interval '1 day 23 hours',
    'clerk_seed_supervisor',
    '183775d0744752d30ac9276459ab57fa99d07e0cd49804bdfc241d0e075809b2',
    '85000000-0000-4000-8000-000000000002',
    'rejected',
    '85100000-0000-4000-8000-000000000002',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    now() - interval '1 day 23 hours',
    2
  ),
  (
    '85200000-0000-4000-8000-000000000003',
    now() - interval '4 days',
    now() - interval '3 days 23 hours',
    'clerk_seed_owner',
    '3c1ff563cdd50584313766d60af885dce5e8b8d3dd02dba92fccb4198c2ee750',
    '85000000-0000-4000-8000-000000000003',
    'approved',
    '85100000-0000-4000-8000-000000000003',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    now() - interval '3 days 23 hours',
    2
  )
ON CONFLICT (id) DO UPDATE SET
  created_at = EXCLUDED.created_at,
  decided_at = EXCLUDED.decided_at,
  decided_by_actor_id = EXCLUDED.decided_by_actor_id,
  proposal_digest = EXCLUDED.proposal_digest,
  run_id = EXCLUDED.run_id,
  status = EXCLUDED.status,
  step_id = EXCLUDED.step_id,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = EXCLUDED.updated_at,
  version = EXCLUDED.version;
