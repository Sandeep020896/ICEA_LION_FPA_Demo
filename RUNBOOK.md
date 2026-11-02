# Session 2 runbook: channels, LitePAS and the integration console

## Before the session (once, after deploying)
| # | Check | Expected |
|---|---|---|
| 1 | Channels, Direct | KES 349 a month, steps all green |
| 2 | Pamoja Bank | KES 10,317 a quarter; Weekly and Flexi greyed "Not offered on Bancassurance" |
| 3 | Tuma Wallet | KES 127 a week (Flexi), Jamii Protect |
| 4 | Haraka Loans | Jamii Lite, Hospital Cash removed, KES 110 a week |
| 5 | Click another plan | Re-quotes as revision 2 on the same quote reference |
| 6 | Get quote documents | Both Spark PDFs open |
| 7 | Accept | Four steps green, POL number, "Open in LitePAS" works |
| 8 | LitePAS policy page | Lifecycle path complete; transactions ledger shows the quotes and New business Bound; certificate PDF opens |
| 9 | Console | Full chain with real Spark call IDs |
| 10 | Get Spark's own log | ZIP downloads (needs the DownloadCsvLog permission on the API key's group) |
| 11 | `transaction_date` | Under the hood: the request shows `transaction_date`; the response is still QUOTED. If Spark rejects it, set it back to null in `channels/lib/spark.js` (one line) |
| 12 | Clear demo data (optional) | `DELETE /api/events` on LitePAS while signed in clears policies and events; seeds return if SEED_DEMO=1 |

## The demo (about 15 minutes)
1. **Direct (Profile A).** "ICEA LION's own site. One call to the quotation service; it asks Product whether this customer can have it, then Rating for the price." Open *How this price was made*.
2. **Pamoja Bank (Profile B).** "Same product through a bank: different plans, commission built in." Point at the greyed plans and their reasons. Click Monthly: revision 2.
3. **Tuma Wallet (Profile C).** "Embedded in a mobile wallet: weekly and Flexi plans for irregular income." Point at the side panel: channel sent, plan applied, versions used.
4. **Haraka Loans.** "Through a lender the product rules give Jamii Lite: smaller cover, no Hospital Cash." Same request shape, different governed answer.
5. **Accept** on any partner: watch the four steps and the tray.
6. **LitePAS.** Policies list, then the policy: lifecycle, rating basis (versions and as-of), transactions ledger, certificate of insurance (issued by the policy system), customer view in the partner's branding.
7. **Integration console.** Walk the sequence: channel, Quotation, Product and Rater by Xcall, back to the channel, hand-off, bind, certificate, CRM. Open one event's JSON. Download the CSV. Get Spark's own log for the same journey.
8. **Failure drill (optional).** Age 66 on Direct: Product declines, Rating is not called, no quote. Show it in *How this price was made* and in the console.

## Talk track for the hand-off
"In production this hop is carried by ICEA LION's ESB. The policy system keeps the versions each policy was priced on, so later approved product or rate changes apply to new business only."
