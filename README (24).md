# ICEA LION channels (Product Builder POC, Session 2)

Customer-facing front end for Jamii Protect. One app, two channel views:

- **Direct**: ICEA LION's own site (Profile A defaults).
- **Partners and embedded**: Pamoja Bank (bank branch, Profile B), Tuma Wallet (mobile money, Profile C) and Haraka Loans (digital lender, Jamii Lite).

Every quote is one call to the Spark service **ILG FPA - Quotation**, which calls **Product Build** and **Rater** by Xcall. The app shows how the price was made (steps from the service trace), lets the user change plan or details (a quote revision), produce the PDFs and accept. Accepting hands the quote to LitePAS (separate app).

## Run locally
```
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```
Set `SPARK_MOCK=1` to work offline: the app then answers from stored responses (one per journey) instead of calling Spark.

## Deploy on Vercel
1. Push this folder to a Git repository and import it in Vercel (framework: Next.js, no build settings needed).
2. Add the environment variables from `.env.example` in Vercel (Production and Preview). Keep `SPARK_MOCK=0`.
3. Deploy. Sign in with `DEMO_PASSWORD`.

## Notes
- The Spark API key is used only on the server (`lib/server.js`); the browser never sees it.
- No personal data goes to Spark: the customer reference is sent in place of the name. The name goes only to LitePAS.
- Each journey has a correlation ID sent in `request_meta.correlation_id`; use it to find the calls in Spark's API Call History.
- `ChildAges` is always sent as a list, as the Quotation service requires.
- LitePAS hand-off: set `LITEPAS_URL` and `INGEST_SECRET` (same secret in LitePAS). Until then, Accept shows the hand-off steps as not sent.
