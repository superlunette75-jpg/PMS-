// GET /ical/<token>.ics : flux iCal d'un membre (son calendrier) ; le jeton maître (settings.master_ical_token) donne tout.
// À ajouter sur le téléphone : Réglages > Calendrier > Comptes > Ajouter un abonnement (iPhone) ou Google Agenda > Autres agendas > URL.
import { serviceClient, settingsMap } from "../_shared/supabase.ts";

function ics(d: string | Date): string { return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
function text(s: string): string { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => "\\" + c); }

Deno.serve(async (req) => {
  const token = (new URL(req.url).pathname.split("/").pop() || "").replace(/\.ics$/, "");
  if (!/^[0-9a-f]{32}$/.test(token)) return new Response("not found", { status: 404 });
  const db = serviceClient(); const s = await settingsMap(db);
  let name = "Kasbah La Moun", staffId: string | null = null;
  if (token !== s.master_ical_token) {
    const { data: st } = await db.from("staff").select("id, name, role").eq("ical_token", token).eq("active", true).maybeSingle();
    if (!st) return new Response("not found", { status: 404 });
    name = "La Moun · " + st.name; if (st.role !== "reception") staffId = st.id;
  }
  const from = new Date(Date.now() - 7 * 86400000).toISOString(), to = new Date(Date.now() + 120 * 86400000).toISOString();
  let q = db.from("events").select("id, title, starts_at, ends_at, status, kind, notes, created_at, orders(short_id, kind, guests(first_name, last_name, phone_e164), stays(suite))")
    .gte("starts_at", from).lte("starts_at", to).in("status", ["pending", "confirmed", "done"]).order("starts_at");
  if (staffId) q = q.eq("staff_id", staffId);
  const { data } = await q;
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kasbah La Moun//PMS//FR", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${text(name)}`, `X-WR-TIMEZONE:${s.timezone || "Africa/Casablanca"}`];
  for (const e of data || []) {
    const o = (e as any).orders; const g = o?.guests; const gname = g ? [g.first_name, g.last_name].filter(Boolean).join(" ") : "";
    const summary = (e.status === "pending" ? "⏳ " : "") + e.title + (gname ? " · " + gname : "");
    const desc = [o?.short_id ? "Réf. " + o.short_id : "", o?.stays?.suite ? "Suite " + o.stays.suite : "", g?.phone_e164 || "", e.notes || ""].filter(Boolean).join("\n");
    L.push("BEGIN:VEVENT", `UID:${e.id}@kasbahlamoun`, `DTSTAMP:${ics(e.created_at)}`, `DTSTART:${ics(e.starts_at)}`, `DTEND:${ics(e.ends_at)}`, `SUMMARY:${text(summary)}`, `DESCRIPTION:${text(desc)}`, `STATUS:${e.status === "pending" ? "TENTATIVE" : "CONFIRMED"}`, "END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return new Response(L.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
});
