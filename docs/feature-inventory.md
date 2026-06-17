# Feature Inventory

Every migrated feature needs one row before implementation.

| Feature                | Source                                              | V2 Owner          | Must Preserve                                                                                | Known Gaps                             | Status |
| ---------------------- | --------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- | ------ |
| Dashboard              | lojaveiculos                                        | web               | Current visual direction and KPI cards                                                       | Need screenshot inventory              | Open   |
| Stock control          | lojaveiculos                                        | api/web           | Listing/unit split, hybrid 0km stock, expenses on unit/listing, sale flow                    | Need V1 vehicle classification profile | Open   |
| Store subdomain page   | lojaveiculos                                        | api/web           | Public inventory pages, SEO behavior, store branding                                         | Custom domain rules need audit         | Open   |
| Leads and CRM WhatsApp | lojaveiculos + repasses-frontend + repasses-backend | api/web + CRM ACL | V2-owned leads, chat, SSE, intervention, labels, team flows, external CRM refs               | Remove iframe and bridge token         | Open   |
| Billing                | lojaveiculos + repasses-backend                     | api/internal      | Asaas, discounts, agency tenant billing, per-store entitlements, banking schema placeholders | Full schema redesign                   | Open   |
| Documents              | lojaveiculos                                        | api/web           | Shared documents linked to leads, listings, units, sales, test drives, and fiscal flows      | Link model and migration parity needed | Open   |
| External API           | lojaveiculos                                        | api               | Dealer actions and analytics endpoints                                                       | Needs AI docs and auth model           | Open   |
| Audit                  | new                                                 | api/packages      | User actions, webhooks, provider events, tiered failure behavior                             | Need critical-flow failure tests       | Open   |
