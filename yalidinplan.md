Ready for review
Select text to add comments on the plan
Finish Yalidine integration (full parity with DHD)
Context
The app ships parcels through two Algerian couriers behind a provider abstraction (lib/delivery/): DHD/Ecotrack (fully working) and Yalidine (create wired, but deleteOrder and fetchStatuses are stubs). The user provided the Yalidine API docs (yalidin_api_docs.md) so Yalidine can reach DHD parity: create, delete, and status-sync all functional.

Two things surfaced during exploration:

Create URL bug. lib/Yalidin/parcel.ts:110 builds ${baseUrl}api/parcel → https://api.yalidine.app/v1/api/parcel, but the docs specify POST /v1/parcels. This was flagged "unverified against live API" and is wrong — it must become ${baseUrl}parcels.
Status sync must be per-provider. app/api/status/route.ts calls p.fetchStatuses() with no args. DHD returns all its orders in one call; Yalidine's only status source per the docs is GET /v1/histories, which is far more efficient when filtered by our own tracking numbers. So fetchStatuses gains an optional trackings argument (DHD ignores it; Yalidine uses it).
User decisions (confirmed):

Status-group mapping is handled by the user — they will add Yalidine's French status strings to status_groups_table.external_statuses themselves. No DB/code work here (see "Status-group config" note below).
Delete response shape (from the user): a JSON array of { tracking, deleted }, where deleted: true = success and deleted: false = deletion impossible (not "En préparation", misspelled, nonexistent, or already deleted).
No new env vars — YALIDINE_API_ID, YALIDINE_API_ID_TOKEN, YALIDINE_API_ID_URL (https://api.yalidine.app/v1/) already exist in .env.

Changes
1. lib/Yalidin/parcel.ts — shared config + fix create URL + delete/histories helpers
Add shared helpers so create/delete/histories share auth + base URL:
function getYalidineConfig() {
  const apiId = process.env.YALIDINE_API_ID;
  const apiToken = process.env.YALIDINE_API_ID_TOKEN;
  let baseUrl = process.env.YALIDINE_API_ID_URL;
  if (!apiId || !apiToken || !baseUrl)
    throw new Error("Missing Yalidine configuration: set YALIDINE_API_ID, YALIDINE_API_ID_TOKEN, YALIDINE_API_ID_URL");
  if (!baseUrl.endsWith("/")) baseUrl += "/";
  return { apiId, apiToken, baseUrl };
}
function yalidineHeaders() {
  const { apiId, apiToken } = getYalidineConfig();
  return { "Content-Type": "application/json", "X-API-ID": apiId, "X-API-TOKEN": apiToken };
}
Fix create (createYalidineParcel): use getYalidineConfig()/yalidineHeaders() and change the URL from ${baseUrl}api/parcel to ${baseUrl}parcels (per docs).
Add deleteYalidineParcel(tracking) — DELETE ${baseUrl}parcels/{tracking} (Method 1, single). Returns { ok, status, data } (parse body defensively like create).
Add fetchYalidineLatestStatuses(trackings: string[]) — GET ${baseUrl}histories/ filtered by our trackings, returning the latest status per tracking:
Chunk trackings (~50/request) into ?tracking=a,b,c (encode each, join with ,).
Query &fields=tracking,status,date_status&order_by=date_status&desc&page_size=1000, paginating via page while the response reports has_more.
Default ordering is date_status DESC, so the first row seen per tracking is its current status → keep first, ignore the rest (Map<tracking, status>).
Guard the response shape (Array.isArray(json) ? json : json?.data ?? []) since the docs omit the histories body; flag as the one shape to confirm on the live API.
Returns Array<{ tracking, status }>.
2. lib/delivery/types.ts — widen the interface
Change fetchStatuses(): Promise<ProviderStatus[]> to fetchStatuses(trackings?: string[]): Promise<ProviderStatus[]> and update the doc comment (Yalidine filters by these; DHD ignores them and returns all).

3. lib/delivery/dhd.ts — accept & ignore the new arg
Signature becomes async fetchStatuses(_trackings?: string[]). Body unchanged (still GET /get/orders, returns every DHD order). Behaviour identical.

4. lib/delivery/yalidine.ts — implement the two stubs
deleteOrder(tracking): call deleteYalidineParcel(tracking); throw on !result.ok (HTTP error). Response is an array of { tracking, deleted }:
const rows = Array.isArray(result.data) ? result.data : [];
const entry = rows.find((r) => r?.tracking === tracking) ?? rows[0];
return { ok: entry?.deleted === true };
A non-deletable parcel (already shipped / progressed past "En préparation") yields ok: false, so the DELETE route in app/api/order/route.ts correctly refuses to restore stock or mark the order canceled.
fetchStatuses(trackings): if (!trackings?.length) return []; else return fetchYalidineLatestStatuses(trackings);.
Exchange fix (createOrder): Yalidine requires product_to_collect when has_exchange is true. Pass product_to_collect: input.type === 2 ? input.produit : null in the createYalidineParcel({...}) call so exchange orders aren't rejected.
5. app/api/status/route.ts — pass each provider its own trackings
Before the Promise.all, group our order ids by provider and pass them in:

const activeOrders = await db
  .select({ id: ordersTable.id, provider: ordersTable.provider })
  .from(ordersTable);
const trackingsByProvider: Record<string, string[]> = {};
for (const o of activeOrders) (trackingsByProvider[o.provider ?? "dhd"] ??= []).push(o.id);

const providerStatuses = (
  await Promise.all(
    DELIVERY_PROVIDERS.map((p) =>
      p.fetchStatuses(trackingsByProvider[p.name] ?? []).catch((e) => {
        console.log(`${p.name} status sync failed`, e);
        return [];
      }),
    ),
  )
).flat();
Everything downstream (status→group mapping, "retour" stock restore, borrower hand-back) is unchanged and now works for Yalidine orders too.

Status-group config (user action, no code)
For sync to actually move Yalidine orders, their exact French status strings must exist in status_groups_table.external_statuses on the matching group. Critically, the retour group must include Yalidine's return statuses or returned stock won't be restored. Suggested additions (Ecotrack may already cover some):

retour ← Retour vers vendeur, Retourné au vendeur, Retour vers centre, Retourné au centre, Retour transfert, Retour groupé, Retour à retirer, Echèc livraison, Echange échoué
delivered/livré ← Livré
out-for-delivery ← Sorti en livraison, Prêt pour livreur
prep/prête ← En préparation, Pas encore expédié, A vérifier
in-transit ← Expédié, En transit, Centre, Vers Wilaya, Reçu à Wilaya, Transfert
canceled ← Annulé
(Full status list is in yalidin_api_docs.md. The user maps these to their own group names.)

Verification
Typecheck/lint: pnpm tsc --noEmit (or pnpm lint) — confirm the interface change compiles across dhd.ts, yalidine.ts, status/route.ts.
Create (already wired): via the order form pick "Yalidine (stop desk)", submit a stop-desk order → expect a yal-… tracking persisted on ordersTable with provider = "yalidine". Confirms the corrected ${baseUrl}parcels URL works live.
Status sync: click the refresh (↻) button in the orders table (GET /api/status) → the Yalidine order's status maps via external_statuses and updates its statusId; a retour status restores stock (and borrower holdings for borrower orders).
Delete: on a Yalidine order still in "En préparation", trigger the order delete (DELETE /api/order) → expect deleted: true, order marked canceled, stock restored. On a progressed parcel → ok:false, route returns an error, stock untouched.
Sanity-check that a DHD create/delete/sync still behaves exactly as before (the interface widening must be a no-op for DHD).