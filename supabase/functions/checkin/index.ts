// POST /checkin : fiche client du guide -> guests + stays, copie vers la Google Sheet, alerte réception.
// Corps : { guest: {...champs du formulaire...}, sheet: {...clés françaises pour la feuille...}, stayToken?: uuid }
// Réponse : { ok, stayToken }
import { json, error, preflight, readJson, str, int, isDate, isTime, phoneE164 } from "../_shared/http.ts";
import { serviceClient, setting } from "../_shared/supabase.ts";
import { notifyCheckin } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== "POST") return error("method", "POST attendu", 405);
  const body = await readJson<{ guest?: Record<string, unknown>; sheet?: Record<string, unknown>; stayToken?: string }>(req);
  const g = body.guest || {};
  if (str(g.trap)) return json({ ok: true, stayToken: null }); // robot : on ne garde rien

  const first = str(g.first, 80), last = str(g.last, 80), phone = phoneE164(str(g.mobile, 40));
  const arrival = str(g.arrival, 10), departure = str(g.departure, 10);
  if (!first || !phone) return error("missing", "Prénom et mobile (WhatsApp) sont obligatoires.");
  if (!isDate(arrival) || !isDate(departure) || departure <= arrival) return error("dates", "Dates de séjour invalides.");
  const email = str(g.email, 120).toLowerCase();
  const lang = ["fr", "en", "es", "de", "ar"].includes(str(g.lang)) ? str(g.lang) : "fr";

  const db = serviceClient();
  const guestRow = {
    first_name: first, last_name: last, email: email || null, phone_e164: phone,
    nationality: str(g.nationality, 80) || null, country: str(g.country, 80) || null, city: str(g.city, 80) || null,
    lang, offers_optin: !!g.offers,
  };
  const { data: guest, error: ge } = await db.from("guests").upsert(guestRow, { onConflict: "phone_e164" }).select("id").single();
  if (ge || !guest) { console.error(ge); return error("db", "Enregistrement impossible.", 500); }

  const stayRow = {
    guest_id: guest.id, arrival, departure, people: int(g.people, 2, 1, 20), suite: str(g.suite, 60) || null,
    purpose: str(g.purpose, 30) || null, purpose_other: str(g.purposeOther, 120) || null,
    source: str(g.source, 30) || null, source_other: str(g.sourceOther, 120) || null,
    checkout_time: isTime(str(g.checkout)) ? str(g.checkout) : null, flight_out: isTime(str(g.flightOut)) ? str(g.flightOut) : null,
    transfer_wish: str(g.transfer, 10) || null, raw: body.sheet || null,
  };
  let stay: { id: string; token: string } | null = null;
  const token = str(body.stayToken, 40);
  if (/^[0-9a-f-]{36}$/.test(token)) {
    const { data } = await db.from("stays").update(stayRow).eq("token", token).eq("guest_id", guest.id).select("id, token").maybeSingle();
    stay = data;
  }
  if (!stay) {
    const { data, error: se } = await db.from("stays").insert(stayRow).select("id, token").single();
    if (se || !data) { console.error(se); return error("db", "Enregistrement impossible.", 500); }
    stay = data;
  }

  // Copie dans la Google Sheet (Apps Script existant), sans bloquer la réponse si elle échoue.
  const script = Deno.env.get("APPS_SCRIPT_URL") || await setting(db, "apps_script_url");
  const tasks: Promise<unknown>[] = [notifyCheckin(db, stay.id)];
  if (script && body.sheet) {
    tasks.push(fetch(script, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...body.sheet, "Token séjour": stay.token }) })
      .catch((e) => console.error("sheet", e)));
  }
  await Promise.allSettled(tasks);
  return json({ ok: true, stayToken: stay.token });
});
