// Rappels (appelée par pg_cron toutes les 15 min, en-tête x-cron-secret = CRON_SECRET) :
//  - à chaque membre, en privé, N minutes avant chacun de ses créneaux (reminder_before_min) ;
//  - le soir (reminder_eve_hour), à chaque membre son programme de demain, et au groupe le récapitulatif
//    de demain (arrivées, départs, transferts, spa, dîners, guides).
import { json, error } from "../_shared/http.ts";
import { serviceClient, settingsMap, Db } from "../_shared/supabase.ts";
import { send, esc } from "../_shared/telegram.ts";
import { KIND_EMOJI } from "../_shared/notify.ts";
import { zonedToUtc, addMin, fmtTime, localDate, localHour, frDate } from "../_shared/time.ts";

function line(e: any, tz: string): string {
  const g = e.orders?.guests; const name = g ? [g.first_name, g.last_name].filter(Boolean).join(" ") : "";
  const suite = e.orders?.stays?.suite; const kind = e.orders?.kind;
  return `${kind ? KIND_EMOJI[kind] + " " : "⏹ "}${fmtTime(new Date(e.starts_at), tz)} ${esc(e.title)}${name ? " · " + esc(name) : ""}${suite ? " · Suite " + esc(suite) : ""}${g?.phone_e164 ? " · " + esc(g.phone_e164) : ""}${e.status === "pending" ? " ⏳" : ""}`;
}

async function soon(db: Db, tz: string, beforeMin: number) {
  const now = new Date(), until = addMin(now, beforeMin);
  const { data } = await db.from("events").select("id, title, starts_at, status, staff_id, orders(kind, guests(first_name, last_name, phone_e164), stays(suite))")
    .eq("kind", "order").in("status", ["pending", "confirmed"]).not("staff_id", "is", null).gt("starts_at", now.toISOString()).lte("starts_at", until.toISOString());
  let sent = 0;
  for (const e of data || []) {
    const { data: done } = await db.from("notifications").select("id").eq("event_id", e.id).eq("staff_id", e.staff_id).eq("kind", "reminder_1h").maybeSingle();
    if (done) continue;
    const { data: st } = await db.from("staff").select("telegram_chat_id").eq("id", e.staff_id).maybeSingle();
    if (!st?.telegram_chat_id) continue;
    const m = await send(st.telegram_chat_id, `⏰ <b>Dans ${Math.max(1, Math.round((new Date(e.starts_at).getTime() - now.getTime()) / 60000))} min</b>\n${line(e, tz)}`);
    await db.from("notifications").insert({ event_id: e.id, staff_id: e.staff_id, chat_id: st.telegram_chat_id, message_id: m?.message_id || null, kind: "reminder_1h" });
    sent++;
  }
  return sent;
}

async function evening(db: Db, tz: string, s: Record<string, string>) {
  const now = new Date(); const tomorrow = localDate(addMin(now, 24 * 60), tz);
  const start = zonedToUtc(tomorrow, "00:00", tz), end = addMin(start, 24 * 60);
  const { data: events } = await db.from("events").select("id, title, starts_at, status, staff_id, kind, orders(kind, guests(first_name, last_name, phone_e164), stays(suite))")
    .gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()).in("status", ["pending", "confirmed"]).order("starts_at");
  let sent = 0;
  // Programme personnel.
  const byStaff: Record<string, any[]> = {};
  for (const e of events || []) if (e.kind === "order" && e.staff_id) (byStaff[e.staff_id] ||= []).push(e);
  for (const staffId of Object.keys(byStaff)) {
    const { data: st } = await db.from("staff").select("telegram_chat_id, name").eq("id", staffId).maybeSingle();
    if (!st?.telegram_chat_id) continue;
    const { data: already } = await db.from("notifications").select("event_id").eq("staff_id", staffId).eq("kind", "reminder_eve").in("event_id", byStaff[staffId].map((e) => e.id));
    const seen = new Set((already || []).map((a: any) => a.event_id));
    const fresh = byStaff[staffId].filter((e) => !seen.has(e.id));
    if (!fresh.length) continue;
    const m = await send(st.telegram_chat_id, `🌙 <b>Demain ${frDate(tomorrow)}</b> — votre programme\n` + byStaff[staffId].map((e) => line(e, tz)).join("\n"));
    await db.from("notifications").insert(fresh.map((e) => ({ event_id: e.id, staff_id: staffId, chat_id: st.telegram_chat_id, message_id: m?.message_id || null, kind: "reminder_eve" })));
    sent++;
  }
  // Récapitulatif du groupe, une fois par jour.
  if (s.telegram_group_id) {
    const key = "digest:" + tomorrow;
    const { data: dup } = await db.from("notifications").select("id").eq("kind", key).maybeSingle();
    if (!dup) {
      const { data: arr } = await db.from("stays").select("suite, people, transfer_wish, guests(first_name, last_name)").eq("arrival", tomorrow);
      const { data: dep } = await db.from("stays").select("suite, checkout_time, guests(first_name, last_name)").eq("departure", tomorrow);
      const nm = (x: any) => [x.guests?.first_name, x.guests?.last_name].filter(Boolean).join(" ");
      const L = [`📋 <b>Demain ${frDate(tomorrow)}</b>`];
      L.push(`\n<b>Arrivées (${arr?.length || 0})</b>` + (arr || []).map((a: any) => `\n🔑 ${esc(nm(a))} · ${a.people} pers.${a.suite ? " · Suite " + esc(a.suite) : ""}${a.transfer_wish === "yes" ? " · transfert souhaité" : ""}`).join(""));
      L.push(`\n<b>Départs (${dep?.length || 0})</b>` + (dep || []).map((d: any) => `\n🚪 ${esc(nm(d))}${d.suite ? " · Suite " + esc(d.suite) : ""}${d.checkout_time ? " · " + String(d.checkout_time).slice(0, 5) : ""}`).join(""));
      L.push(`\n<b>Programme (${events?.length || 0})</b>` + (events || []).map((e) => "\n" + line(e, tz)).join(""));
      const m = await send(s.telegram_group_id, L.join("\n"));
      await db.from("notifications").insert({ chat_id: s.telegram_group_id, message_id: m?.message_id || null, kind: key });
      sent++;
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET") || "";
  const auth = req.headers.get("authorization") || "";
  const okSecret = (secret && req.headers.get("x-cron-secret") === secret) || (auth === "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!okSecret) return error("auth", "Non autorisé", 401);
  const db = serviceClient(); const s = await settingsMap(db); const tz = s.timezone || "Africa/Casablanca";
  const force = new URL(req.url).searchParams.get("force"); // force=evening pour tester le récapitulatif
  const out: Record<string, number> = { soon: await soon(db, tz, Number(s.reminder_before_min) || 60) };
  if (force === "evening" || localHour(new Date(), tz) === (Number(s.reminder_eve_hour) || 20)) out.evening = await evening(db, tz, s);
  return json({ ok: true, ...out });
});
