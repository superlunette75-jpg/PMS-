// POST /order : une demande du guide (transfert, spa, dîner, conciergerie) -> commande + créneaux + Telegram.
// GET  /order?stay=<token> : les demandes d'un séjour (page « Mon séjour »).
// Corps POST : { stayToken?, guest?: {name, phone, suite}, kind, lang, message, items: [{key,labelFr,qty,unitPriceMad,durationMin}], details: {...}, notes }
import { json, error, preflight, readJson, str, int, isDate, isTime, phoneE164 } from "../_shared/http.ts";
import { serviceClient, settingsMap, staffFromAuth, Db } from "../_shared/supabase.ts";
import { zonedToUtc, addMin, fmtDateTime, fmtTime } from "../_shared/time.ts";
import { notifyNewOrder } from "../_shared/notify.ts";

type Item = { key?: string; labelFr: string; qty: number; unitPriceMad?: number | null; durationMin?: number | null };

async function resource(db: Db, kind: string) {
  const { data } = await db.from("resources").select("*").eq("kind", kind).eq("active", true).order("name").limit(1).maybeSingle();
  return data;
}
async function receptionStaff(db: Db) {
  const { data } = await db.from("staff").select("id").eq("role", "reception").eq("active", true).order("created_at").limit(1).maybeSingle();
  return data?.id || null;
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const db = serviceClient();
  const s = await settingsMap(db); const tz = s.timezone || "Africa/Casablanca";

  if (req.method === "GET") {
    const token = str(new URL(req.url).searchParams.get("stay"), 40);
    if (!/^[0-9a-f-]{36}$/.test(token)) return error("token", "Séjour inconnu.", 404);
    const { data: stay } = await db.from("stays").select("id, arrival, departure, suite, guests(first_name)").eq("token", token).maybeSingle();
    if (!stay) return error("token", "Séjour inconnu.", 404);
    const { data: orders } = await db.from("orders").select("short_id, kind, status, requested_at, total_mad, lang, order_items(label_fr, qty, unit_price_mad), events(title, starts_at, ends_at, kind)")
      .eq("stay_id", stay.id).order("requested_at", { ascending: false });
    const list = (orders || []).map((o: any) => ({
      id: o.short_id, kind: o.kind, status: o.status, requestedAt: o.requested_at, totalMad: o.total_mad,
      items: (o.order_items || []).map((i: any) => ({ label: i.label_fr, qty: i.qty, price: i.unit_price_mad })),
      when: (o.events || []).filter((e: any) => e.kind === "order").map((e: any) => ({ title: e.title, start: e.starts_at, end: e.ends_at })),
    }));
    return json({ ok: true, stay: { arrival: stay.arrival, departure: stay.departure, suite: stay.suite, first: (stay as any).guests?.first_name }, orders: list }, 200, { "Cache-Control": "no-store" });
  }
  if (req.method !== "POST") return error("method", "POST attendu", 405);

  const b = await readJson<any>(req);
  const kind = str(b.kind); if (!["transfer", "spa", "dinner", "concierge"].includes(kind)) return error("kind", "Type de demande inconnu.");
  const lang = ["fr", "en", "es", "de", "ar"].includes(str(b.lang)) ? str(b.lang) : "fr";
  const d = (b.details && typeof b.details === "object") ? b.details : {};
  const items: Item[] = Array.isArray(b.items) ? b.items.slice(0, 30).map((i: any) => ({
    key: str(i.key, 40), labelFr: str(i.labelFr, 160), qty: int(i.qty, 1, 1, 30), unitPriceMad: i.unitPriceMad == null ? null : int(i.unitPriceMad, 0, 0, 100000), durationMin: i.durationMin == null ? null : int(i.durationMin, 0, 0, 600),
  })).filter((i: Item) => i.labelFr) : [];

  // Qui commande : un séjour (token du check-in), ou nom + WhatsApp saisis dans le formulaire, ou l'équipe (jeton Auth).
  const staff = await staffFromAuth(db, req);
  let stay: any = null, guestId: string | null = null;
  const token = str(b.stayToken, 40);
  if (/^[0-9a-f-]{36}$/.test(token)) {
    const { data } = await db.from("stays").select("id, guest_id, suite").eq("token", token).maybeSingle(); stay = data; guestId = data?.guest_id || null;
  }
  if (!guestId) {
    const name = str(b.guest?.name, 120), phone = phoneE164(str(b.guest?.phone, 40));
    if (!name || !phone) return error("guest", "Nom et numéro WhatsApp obligatoires.");
    const [first, ...rest] = name.split(/\s+/);
    const { data: g, error: ge } = await db.from("guests").upsert({ first_name: first, last_name: rest.join(" "), phone_e164: phone, lang }, { onConflict: "phone_e164" }).select("id").single();
    if (ge || !g) { console.error(ge); return error("db", "Enregistrement impossible.", 500); }
    guestId = g.id;
  }
  if (!stay && str(b.guest?.suite)) d.suite = str(b.guest.suite, 60);

  // Créneaux à créer selon le type.
  type Ev = { resource_id: string | null; staff_id: string | null; starts_at: Date; ends_at: Date; title: string; party_size: number; exclusive: boolean };
  const evs: Ev[] = []; const warnings: string[] = [];
  let total = 0; items.forEach((i) => { total += (i.unitPriceMad || 0) * i.qty; });

  if (kind === "transfer") {
    const date = str(d.date, 10), time = str(d.time, 5);
    if (!isDate(date) || !isTime(time)) return error("when", "Date et heure d'arrivée obligatoires.");
    const r = await resource(db, "vehicle"); const people = int(d.people, 1, 1, 20);
    const start = zonedToUtc(date, time, tz);
    evs.push({ resource_id: r?.id || null, staff_id: r?.default_staff_id || null, starts_at: start, ends_at: addMin(start, 90), title: "Transfert aéroport → riad", party_size: people, exclusive: false });
    if (d.round && isDate(str(d.backDate)) && isTime(str(d.backTime))) {
      const bs = zonedToUtc(str(d.backDate), str(d.backTime), tz);
      evs.push({ resource_id: r?.id || null, staff_id: r?.default_staff_id || null, starts_at: bs, ends_at: addMin(bs, 90), title: "Transfert riad → aéroport", party_size: people, exclusive: false });
    }
    if (r) for (const e of evs) {
      const { data: clash } = await db.from("events").select("title, starts_at").eq("resource_id", r.id).in("status", ["pending", "confirmed"])
        .lt("starts_at", e.ends_at.toISOString()).gt("ends_at", e.starts_at.toISOString());
      (clash || []).forEach((c: any) => warnings.push(`⚠️ Chevauche « ${c.title} » à ${fmtTime(new Date(c.starts_at), tz)}`));
    }
  }

  if (kind === "spa") {
    const date = str(d.date, 10), slot = str(d.slot, 5);
    if (!items.length) return error("items", "Choisissez au moins un soin.");
    if (!isDate(date) || !isTime(slot)) return error("when", "Choisissez une date et un créneau.", 400, { needSlot: true });
    const duration = Math.max(30, items.reduce((n, i) => n + (i.durationMin || 60) * i.qty, 0));
    const { data: free } = await db.rpc("free_slots", { p_kind: "spa", p_date: date, p_duration_min: duration });
    const start = zonedToUtc(date, slot, tz);
    const pick = (free || []).find((f: any) => new Date(f.starts_at).getTime() === start.getTime());
    if (!pick) return error("slot_taken", "Ce créneau vient d'être pris. Choisissez-en un autre.", 409, { slots: (free || []).map((f: any) => f.label) });
    const r = await db.from("resources").select("default_staff_id").eq("id", pick.resource_id).maybeSingle();
    evs.push({ resource_id: pick.resource_id, staff_id: r.data?.default_staff_id || null, starts_at: start, ends_at: addMin(start, duration), title: "Spa : " + items.map((i) => (i.qty > 1 ? i.qty + " x " : "") + i.labelFr).join(", "), party_size: int(d.people, 1, 1, 4), exclusive: true });
  }

  if (kind === "dinner") {
    const date = str(d.date, 10), time = str(d.time, 5) || "20:00"; const guests = int(d.guests, 2, 1, 30);
    if (!isDate(date)) return error("when", "Date du dîner obligatoire.");
    const r = await resource(db, "dining"); const start = zonedToUtc(date, time, tz), end = addMin(start, 120);
    if (r) {
      const { data: load } = await db.rpc("dining_load", { p_resource: r.id, p_start: start.toISOString(), p_end: end.toISOString() });
      if ((load || 0) + guests > (r.capacity || 16)) return error("full", "La table est complète à cette heure. Essayez une autre heure ou contactez l'équipe.", 409);
    }
    evs.push({ resource_id: r?.id || null, staff_id: r?.default_staff_id || null, starts_at: start, ends_at: end, title: `Dîner ${guests} couverts`, party_size: guests, exclusive: false });
    if (d.allergies) warnings.push(`🥗 ${str(d.allergies, 300)}`);
  }

  if (kind === "concierge") {
    const id = str(d.requestId, 30); const date = str(d.date, 10); const label = str(d.labelFr, 160) || items[0]?.labelFr || "Demande";
    if (!items.length) items.push({ key: id, labelFr: label, qty: 1, unitPriceMad: d.priceMad == null ? null : int(d.priceMad, 0, 0, 100000), durationMin: null });
    const guideLike = ["guide", "guide-journee", "zat"].includes(id);
    if (guideLike) {
      if (!isDate(date)) return error("when", "Choisissez une date.");
      const r = await resource(db, "guide"); const span = id === "guide" ? ["09:00", 240] : id === "zat" ? ["08:30", 540] : ["09:00", 480];
      const start = zonedToUtc(date, span[0] as string, tz);
      evs.push({ resource_id: r?.id || null, staff_id: r?.default_staff_id || null, starts_at: start, ends_at: addMin(start, span[1] as number), title: label, party_size: int(d.people, 2, 1, 30), exclusive: true });
    } else {
      const day = isDate(date) ? date : new Date().toISOString().slice(0, 10);
      const start = zonedToUtc(day, "09:00", tz);
      evs.push({ resource_id: null, staff_id: await receptionStaff(db), starts_at: start, ends_at: addMin(start, 30), title: "Conciergerie : " + label, party_size: int(d.people, 2, 1, 30), exclusive: false });
    }
  }

  // Écriture : commande, lignes, créneaux. Un conflit sur une ressource exclusive annule tout.
  const orderRow = {
    stay_id: stay?.id || null, guest_id: guestId, kind, lang, notes: str(b.notes, 1000) || null, guest_message: str(b.message, 4000) || null,
    details: d, total_mad: total || null, created_by: staff ? "staff:" + staff.id : "guest",
  };
  const { data: order, error: oe } = await db.from("orders").insert(orderRow).select("id, short_id").single();
  if (oe || !order) { console.error(oe); return error("db", "Enregistrement impossible.", 500); }
  if (items.length) await db.from("order_items").insert(items.map((i) => ({ order_id: order.id, label_fr: i.labelFr, qty: i.qty, unit_price_mad: i.unitPriceMad, duration_min: i.durationMin, catalog_key: i.key || null })));
  const { error: ee } = await db.from("events").insert(evs.map((e) => ({ order_id: order.id, resource_id: e.resource_id, staff_id: e.staff_id, starts_at: e.starts_at.toISOString(), ends_at: e.ends_at.toISOString(), title: e.title, party_size: e.party_size, exclusive: e.exclusive })));
  if (ee) {
    await db.from("orders").delete().eq("id", order.id);
    if (ee.code === "23P01") return error("slot_taken", "Ce créneau vient d'être pris. Choisissez-en un autre.", 409);
    console.error(ee); return error("db", "Enregistrement impossible.", 500);
  }

  await notifyNewOrder(db, order.id, warnings);
  return json({ ok: true, orderId: order.short_id, status: "pending", when: evs.map((e) => fmtDateTime(e.starts_at, tz)) });
});
