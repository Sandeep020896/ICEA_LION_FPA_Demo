# ICEA LION Product Builder POC: front ends

Two Next.js apps in one repository:

| Folder | App | What it is |
|---|---|---|
| `channels/` | ICEA LION channels | Customer-facing: Direct (ICEA LION site) and Partners and embedded (Pamoja Bank, Tuma Wallet, Haraka Loans). Quotes live from Spark (ILG FPA - Quotation, which calls Product Build and Rater by Xcall). |
| `litepas/` | LitePAS | Policy administration that receives accepted quotes, the partner-branded customer view, and the integration console. |

## Deploy on Vercel (one repo, two projects)
1. Push this folder to GitHub.
2. In Vercel, **Add New Project** and import the repo **twice**:
   - Project 1: Root Directory `litepas`
   - Project 2: Root Directory `channels`
3. LitePAS project:
   - Marketplace: add **Upstash Redis** to the project (sets `KV_REST_API_URL`, `KV_REST_API_TOKEN`).
   - Environment variables from `litepas/.env.example`: `DEMO_PASSWORD`, `SESSION_TOKEN`, `INGEST_SECRET`, `SEED_DEMO=1`, and the Spark settings (for the log download).
   - Deploy and note its URL, e.g. `https://icea-litepas.vercel.app`.
4. Channels project:
   - Environment variables from `channels/.env.example`: the Spark settings, `DEMO_PASSWORD`, `SESSION_TOKEN`, `SPARK_MOCK=0`, `LITEPAS_URL` (the LitePAS URL from step 3) and `INGEST_SECRET` (**the same value** as in LitePAS).
   - Deploy.
5. Open the channels app, quote, accept, then open LitePAS: the policy and the whole journey are there.

## Spark settings (both apps)
```
SPARK_BASE_URL=https://excel.uat.jp.coherent.global
SPARK_TENANT=actuarial
SPARK_FOLDER=ICEA LION FPA Demo
SPARK_QUOTE_SERVICE=ILG FPA - Quotation
SPARK_API_KEY=<your key>
```
Keep the API key in Vercel's environment variables only; never commit it.

## Preview in StackBlitz
Open each folder as its own project and add `.env.local`:
- channels: `SPARK_MOCK=1`, `DEMO_PASSWORD`, `SESSION_TOKEN`
- litepas: `DEMO_PASSWORD`, `SESSION_TOKEN`, `SEED_DEMO=1`
Live Spark calls are for Vercel; in StackBlitz use the mock.
