INSERT INTO "role_template_permissions" ("role_template_id", "permission_key")
VALUES
  ('22222222-2222-4222-8222-222222222222', 'crm.consent.record'),
  ('22222222-2222-4222-8222-222222222222', 'crm.contact.merge'),
  ('22222222-2222-4222-8222-222222222222', 'crm.contact_identity.dispute'),
  ('22222222-2222-4222-8222-222222222222', 'crm.contact_identity.verify'),
  ('11111111-1111-4111-8111-111111111111', 'crm.consent.record'),
  ('11111111-1111-4111-8111-111111111111', 'crm.contact.merge'),
  ('11111111-1111-4111-8111-111111111111', 'crm.contact_identity.dispute'),
  ('11111111-1111-4111-8111-111111111111', 'crm.contact_identity.verify'),
  ('55555555-5555-4555-8555-555555555555', 'crm.consent.record'),
  ('55555555-5555-4555-8555-555555555555', 'crm.contact.merge'),
  ('55555555-5555-4555-8555-555555555555', 'crm.contact_identity.dispute'),
  ('55555555-5555-4555-8555-555555555555', 'crm.contact_identity.verify')
ON CONFLICT ("role_template_id", "permission_key") DO NOTHING;
