// Réservations Octorate.
//  POST /octorate?action=mail    en-tête x-mail-secret (réglage octorate_mail_secret) : un e-mail transmis par le script Gmail
//      corps { messageId, from, subject, date, body }  -> gardé, analysé, réservation créée / mise à jour / annulée, équipe prévenue
//  POST /octorate?action=ical    x-cron-secret (cron horaire) ou gérant connecté : synchronise les liens iCal des suites
//  POST /octorate?action=reparse gérant connecté, corps { id } : réanalyse un e-mail gardé
import { json, error, preflight, readJson, str } from "../_shared/http.ts";
import { serviceClient, settingsMap, staffFromAuth, Db } from "../_shared/supabase.ts";
import { send, esc, tgEnabled } from "../_shared/telegram.ts";
import { pushTo, officeIds } from "../_shared/push.ts";
import { frDate } from "../_shared/time.ts";
import { parseMail, canonicalRef, parseIcal, isBlock, suiteFromNumber, nightsBetween, ParsedMail } from "../_shared/octorate.ts";

const CANCELLED = "Paiement annulé", CONFIRMED = "Réservation confirmée";

async function announce(db: Db, s: Record<string, string>, title: string, lines: string[]) {
  if (s.__quiet) return;
  await pushTo(db, await officeIds(db), { title, body: lines.join(" · "), url: "#jour", tag: "booking-" + title });
  if (tgEnabled() && s.telegram_group_id) await send(s.telegram_group_id, `<b>${esc(title)}</b>\n` + lines.map(esc).join("\n"), { threadId: s.topic_checkin || undefined });
}

/* Applique un e-mail analysé à la table des réservations. Renvoie le statut de l'e-mail. */
async function applyMail(db: Db, p: ParsedMail, s: Record<string, string>, mailId: string): Promise<{ status: string; ref?: string; error?: string }> {
  const ref = canonicalRef(p);
  if (!ref && !p.arrival) return { status: "ignored", error: "Pas une réservation (ni référence ni dates)" };
  if (!ref) return { status: "needs_review", error: "Référence introuvable" };
  const { data: existing } = await db.from("lh_reservations").select("ref, status, arrival, departure, rooms, first_name, last_name").eq("ref", ref).maybeSingle();
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || (existing ? [existing.first_name, existing.last_name].filter(Boolean).join(" ") : "Client");

  if (p.kind === "cancelled") {
    if (existing) await db.from("lh_reservations").update({ status: CANCELLED, cancelled_on: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }).eq("ref", ref);
    else if (p.arrival && p.departure) await db.from("lh_reservations").insert(row(p, ref, mailId, CANCELLED));
    else return { status: "needs_review", ref, error: "Annulation d'une réservation inconnue, sans dates" };
    const a = p.arrival || existing?.arrival, d = p.departure || existing?.departure;
    await announce(db, s, "❌ Annulation · " + name, [p.channel || "Octorate", a && d ? frDate(a) + " → " + frDate(d) : "", existing?.rooms ? "Suite " + existing.rooms : ""].filter(Boolean));
    return { status: "cancelled", ref };
  }
  if (!p.arrival || !p.departure) return { status: "needs_review", ref, error: "Dates introuvables" };
  const r = row(p, ref, mailId, CONFIRMED);
  if (existing) {
    // Mise à jour : ne pas effacer ce que l'e-mail ne précise pas (suite remplie par l'iCal, par exemple).
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) if (v != null && v !== "" && k !== "ref") patch[k] = v;
    if (existing.status === CANCELLED && p.kind !== "modified") delete patch.status;
    await db.from("lh_reservations").update(patch).eq("ref", ref);
  } else {
    await db.from("lh_reservations").insert(r);
    // Une ligne iCal pour la même suite et les mêmes dates fait doublon : on la retire, en gardant sa suite.
    const { data: dup } = await db.from("lh_reservations").select("ref, rooms").eq("source", "ical").eq("arrival", p.arrival).eq("departure", p.departure);
    for (const x of dup || []) {
      if (!r.rooms || x.rooms === r.rooms) {
        if (!r.rooms && x.rooms) await db.from("lh_reservations").update({ rooms: x.rooms }).eq("ref", ref);
        await db.from("lh_reservations").delete().eq("ref", x.ref);
        if (!r.rooms) break;
      }
    }
  }
  const pax = (p.adults || 0) + (p.children || 0);
  await announce(db, s, (existing ? "✏️ Réservation modifiée · " : "🛎 Nouvelle réservation · ") + name, [
    p.channel || "Octorate", frDate(p.arrival) + " → " + frDate(p.departure) + " (" + nightsBetween(p.arrival, p.departure) + " nuits)",
    r.rooms ? "Suite " + r.rooms : p.roomType || "", pax ? pax + " pers." : "", p.total != null ? p.total + " " + (p.currency || "") : "",
  ].filter(Boolean));
  return { status: "parsed", ref };
}

function row(p: ParsedMail, ref: string, mailId: string, status: string) {
  const nights = p.arrival && p.departure ? nightsBetween(p.arrival, p.departure) : null;
  return {
    ref, source: "octorate-mail", source_ref: mailId, channel: p.channel || "Octorate", first_name: p.firstName || null, last_name: p.lastName || null,
    email: p.email || null, phone: p.phone || null, arrival: p.arrival || null, departure: p.departure || null, nights, eta: p.eta || null,
    notes: p.notes || null, status, room_types: p.roomType || null, rooms: p.rooms || null, rooms_count: 1,
    adults: p.adults ?? null, children: p.children ?? 0, total: p.currency === "MAD" ? p.total ?? null : null, currency: p.currency || null,
    comments: p.currency && p.currency !== "MAD" && p.total != null ? `Montant : ${p.total} ${p.currency}` : null,
    booked_on: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString(),
  };
}

async function handleMail(db: Db, req: Request) {
  const s = await settingsMap(db);
  if (!s.octorate_mail_secret || req.headers.get("x-mail-secret") !== s.octorate_mail_secret) return error("auth", "Non autorisé", 401);
  const b = await readJson<Record<string, unknown>>(req);
  const messageId = str(b.messageId, 300), subject = str(b.subject, 500), body = str(b.html, 300000) || str(b.text, 200000) || str(b.body, 200000);
  if (!body) return error("input", "E-mail vide.");
  if (b.dry === true) { const p = parseMail(subject, body); return json({ ok: true, dry: true, ref: canonicalRef(p), parsed: p }); }   // test : lecture seule
  if (b.notify === false) s.__quiet = "1";                                                                                         // test : sans prévenir l'équipe
  if (messageId) {
    const { data: seen } = await db.from("inbound_emails").select("id, status").eq("message_id", messageId).maybeSingle();
    if (seen) return json({ ok: true, duplicate: true, status: seen.status });
  }
  const { data: mail, error: e } = await db.from("inbound_emails").insert({ message_id: messageId || null, from_addr: str(b.from, 300), subject, sent_at: b.date ? new Date(String(b.date)).toISOString() : null, body }).select("id").single();
  if (e || !mail) return error("db", "Enregistrement impossible : " + (e?.message || ""), 500);
  return json({ ok: true, ...(await analyse(db, s, mail.id, subject, body)) });
}

async function analyse(db: Db, s: Record<string, string>, id: string, subject: string, body: string) {
  let parsed: ParsedMail | null = null, res: { status: string; ref?: string; error?: string };
  try { parsed = parseMail(subject, body); res = await applyMail(db, parsed, s, id); }
  catch (err) { console.error(err); res = { status: "error", error: String(err) }; }
  await db.from("inbound_emails").update({ status: res.status, ref: res.ref || null, parsed, error: res.error || (parsed?.missing.length ? "Manque : " + parsed.missing.join(", ") : null) }).eq("id", id);
  return res;
}

async function syncIcal(db: Db) {
  const s = await settingsMap(db);
  let feeds: Record<string, string> = {};
  try { feeds = JSON.parse(s.ical_feeds || "{}"); } catch { /* vide */ }
  const today = new Date().toISOString().slice(0, 10);
  const report = { at: new Date().toISOString(), feeds: 0, events: 0, created: 0, filled: 0, removed: 0, errors: [] as string[] };
  for (const [no, url] of Object.entries(feeds)) {
    const suite = suiteFromNumber(Number(no)); if (!suite || !/^https?:\/\//.test(url || "")) continue;
    report.feeds++;
    let events;
    try {
      const r = await fetch(url, { headers: { "User-Agent": "LaMoun-PMS/1.0 (ical sync)" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      events = parseIcal(await r.text()).filter((e) => !isBlock(e) && e.end >= today);
    } catch (err) { report.errors.push(`Suite ${no} : ${err instanceof Error ? err.message : err}`); continue; }
    report.events += events.length;
    const seen = new Set<string>();
    for (const e of events) {
      const ref = `ICAL-${no}-${await shortHash(e.uid)}`; seen.add(ref);
      // Réservation déjà connue (e-mail Octorate ou Little Hotel) aux mêmes dates : on complète la suite, pas de doublon.
      const { data: same } = await db.from("lh_reservations").select("ref, rooms").neq("source", "ical").neq("status", CANCELLED).eq("arrival", e.start).eq("departure", e.end);
      const match = (same || []).find((x) => x.rooms === suite) || (same || []).find((x) => !x.rooms);
      if (match) {
        if (!match.rooms) { await db.from("lh_reservations").update({ rooms: suite }).eq("ref", match.ref); report.filled++; }
        await db.from("lh_reservations").delete().eq("ref", ref);
        continue;
      }
      const name = e.summary && !/^(reserved|booked|réservé|prenotato|reservation|booking)\b/i.test(e.summary) ? e.summary.slice(0, 80) : "Réservé (iCal)";
      const { data: had } = await db.from("lh_reservations").select("ref").eq("ref", ref).maybeSingle();
      await db.from("lh_reservations").upsert({ ref, source: "ical", source_ref: e.uid, channel: "iCal", last_name: name, arrival: e.start, departure: e.end, nights: nightsBetween(e.start, e.end), rooms: suite, rooms_count: 1, status: CONFIRMED, notes: e.description ? e.description.slice(0, 300) : null, updated_at: new Date().toISOString() }, { onConflict: "ref" });
      if (!had) report.created++;
    }
    // Disparu du calendrier (et pas encore commencé) : annulé.
    const { data: old } = await db.from("lh_reservations").select("ref").eq("source", "ical").eq("rooms", suite).gte("arrival", today).neq("status", CANCELLED);
    for (const o of old || []) if (!seen.has(o.ref)) { await db.from("lh_reservations").update({ status: CANCELLED, cancelled_on: today }).eq("ref", o.ref); report.removed++; }
  }
  await db.from("settings").upsert({ key: "ical_last_sync", value: JSON.stringify(report) });
  return report;
}
async function shortHash(s: string) {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s)));
  return Array.from(b.slice(0, 6)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== "POST") return error("method", "POST attendu", 405);
  const db = serviceClient();
  const action = new URL(req.url).searchParams.get("action") || "";
  if (action === "mail") return handleMail(db, req);

  const cron = Deno.env.get("CRON_SECRET") && req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");
  const me = cron ? null : await staffFromAuth(db, req);
  if (!cron && me?.access !== "manager") return error("auth", "Réservé aux gérants.", 403);
  if (action === "ical") return json({ ok: true, report: await syncIcal(db) });
  if (action === "reparse" && me) {
    const b = await readJson<{ id?: string }>(req);
    const { data: m } = await db.from("inbound_emails").select("id, subject, body").eq("id", str(b.id, 40)).maybeSingle();
    if (!m) return error("notfound", "E-mail introuvable.", 404);
    return json({ ok: true, ...(await analyse(db, await settingsMap(db), m.id, m.subject || "", m.body || "")) });
  }
  return error("input", "Action inconnue.");
});
