# R2 CORS Policies

Loja Veiculos V2 uses Cloudflare R2 presigned `PUT` URLs for browser uploads.
The presigned URL proves the request is authorized, but browser uploads still
need bucket CORS configured on the R2 bucket.

## Files

- `docs/ops/r2-cors-lojaveiculosv2.json` is the Cloudflare dashboard JSON-tab
  format.
- `docs/ops/r2-cors-lojaveiculosv2-wrangler.json` is the Wrangler/API format
  accepted by `wrangler r2 bucket cors set`.

Both files allow:

- Deployed app origins currently documented for V2.
- Local Playwright/Vite origins:
  - default `http://127.0.0.1:5173` / `http://localhost:5173`
  - Vite preview `4173`
  - isolated QA lanes `5174` through `5189`
  - multi-agent lanes `5200` through `5209`
  - high isolated lanes `5290` through `5299`
- Methods `PUT`, `GET`, and `HEAD`.
- Upload header `Content-Type`.
- Exposed headers `ETag` and `Content-Length`.

Cloudflare R2 requires origins to match the browser `Origin` exactly, without
paths. If an agent uses another port, add both exact origins before running the
upload path:

```json
"http://localhost:<port>",
"http://127.0.0.1:<port>"
```

## Apply With Dashboard

1. Open Cloudflare dashboard.
2. Go to R2 object storage and select the V2 bucket.
3. Open Settings, then CORS Policy.
4. Paste `docs/ops/r2-cors-lojaveiculosv2.json` into the JSON tab.
5. Save and wait at least 30 seconds before retesting browser uploads.

## Apply With Wrangler

```bash
npx wrangler r2 bucket cors set "$R2_BUCKET_NAME" \
  --file docs/ops/r2-cors-lojaveiculosv2-wrangler.json

npx wrangler r2 bucket cors list "$R2_BUCKET_NAME"
```

## Verify A Local Origin

Use the same origin as the Playwright or browser session:

```bash
curl -i -X OPTIONS "$R2_PUBLIC_BASE_URL/some-existing-object" \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type"
```

The response should include `access-control-allow-origin` matching the origin,
`access-control-allow-methods` containing `PUT`, and
`access-control-allow-headers` allowing `content-type`.

If the bucket is behind an R2 custom domain, purge that hostname after changing
CORS so cached objects do not keep old response headers.
