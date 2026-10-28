# LitePAS (ICEA LION Product Builder POC, Session 2)

Policy administration that receives accepted quotes from the channels app, plus the integration console.

- **Policies** (`/policies`): every bound policy, with channel and product.
- **Policy page** (`/policies/POL-000001`): lifecycle path (quoted, revised, documents, accepted, bound, customer record), rating basis (Product, Rating and Quote versions it was priced on), journey history with Spark call IDs, cover, documents, instalments, customer record and the payload received.
- **Customer view** (`/customer/POL-000001`): the policy as the customer sees it, in the selling partner's branding.
- **Integration console** (`/console`): every hop of a journey as a live sequence diagram (channel, Spark Quotation, Product and Rater by Xcall, LitePAS, CRM), event table with the JSON sent and received, CSV download, and Spark's own API call log for the journey (by correlation ID).

## Endpoints the channels app calls
- `POST /api/ingest/event`: one event per Spark call (header `x-ingest-secret`).
- `POST /api/ingest/policy`: an accepted quote; creates the policy and the customer record, returns the policy number (header `x-ingest-secret`). In production this hop is carried by ICEA LION's ESB.

## Storage
Attach **Upstash Redis** from the Vercel Marketplace to this project; it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without them LitePAS keeps data in memory, which is fine for StackBlitz but resets whenever the server restarts (and is not shared between Vercel instances). `SEED_DEMO=1` adds three demo policies when storage is empty.

## Spark log download
Uses Spark's API Call History endpoints (`log/downloadcsv` and `log/downloadcsv/status/{jobId}`). The API key's group needs the `Spark.DownloadCsvLog.json` permission; without it the console shows Spark's refusal at the first step.

## Run locally
```
npm install
cp .env.example .env.local   # fill in
npm run dev                  # http://localhost:3001
```
