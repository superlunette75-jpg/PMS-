// Webhook du bot Telegram : liaison des membres (/start <code>), /id, /agenda, et boutons Accepter / Refuser / Terminé / Annuler.
// À déclarer une fois : https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL de cette fonction>&secret_token=<TELEGRAM_WEBHOOK_SECRET>
import { json } from "../_shared/http.ts";
import { serviceClient, settingsMap, Db } from "../_shared/supabase.ts";
import { send, answer, esc } from "../_shared/telegram.ts";
import { applyDecision, STATUS_LABEL } from "../_shared/notify.ts";
import { fmtTime, localDate, zonedToUtc, addMin, frDate } from "../_shared/time.ts";

const ACTION: Record<string, { to: string; from: string[]; label: string }> = {
  ok: { to: "confirmed", from: ["pending"], label: "Accepté ✅" },
  no: { to: "declined", from: ["pending"], label: "Refusé ❌" },
  done: { to: "done", from: ["confirmed"], label: "Terminé ✔️" },
  cancel: { to: "cancelled", from: ["pending", "confirmed"], label: "Annulé" },
};

async function staffByChat(db: Db, chatId: number) {
  const { data } = await db.from("staff").select("*").eq("telegram_chat_id", chatId).eq("active", true).maybeSingle();
  return data;
}

async function agenda(db: Db, staff: any, tz: string): Promise<string> {
  const today = localDate(new Date(), tz);
  const start = zonedToUtc(today, "00:00", tz), end = addMin(start, 48 * 60);
  let q = db.from("events").select("title, starts_at, status, kind, orders(short_id, guests(first_name, last_name, phone_e164), stays(suite))")
    .gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()).in("status", ["pending", "confirmed"]).order("starts_at");
  if (staff.role !== "reception") q = q.eq("staff_id", staff.id);
  const { data } = await q;
  if (!data?.length) return "Rien au programme aujourd'hui ni demain.";
  const byDay: Record<string, string[]> = {};
  for (const e of data) {
    const day = localDate(new Date(e.starts_at), tz);
    const g = (e as any).orders?.guests; const name = g ? [g.first_name, g.last_name].filter(Boolean).join(" ") : "";
    const suite = (e as any).orders?.stays?.suite;
    (byDay[day] ||= []).push(`${fmtTime(new Date(e.starts_at), tz)} ${esc(e.title)}${name ? " · " + esc(name) : ""}${suite ? " · Suite " + esc(suite) : ""}${e.status === "pending" ? " ⏳" : ""}`);
  }
  return Object.keys(byDay).sort().map((d) => `<b>${d === today ? "Aujourd'hui" : "Demain"} (${frDate(d)})</b>\n` + byDay[d].join("\n")).join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) return new Response("forbidden", { status: 403 });
  const upd = await req.json().catch(() => ({}));
  const db = serviceClient();
  const tz = (await settingsMap(db)).timezone || "Africa/Casablanca";

  if (upd.callback_query) {
    const cq = upd.callback_query; const m = /^o:([A-Z0-9]+):(ok|no|done|cancel)$/.exec(cq.data || "");
    if (!m) { await answer(cq.id); return json({ ok: true }); }
    const staff = await staffByChat(db, cq.from?.id);
    if (!staff) { await answer(cq.id, "Ouvrez d'abord le bot en privé avec votre code (/start <code>)."); return json({ ok: true }); }
    const { data: order } = await db.from("orders").select("id, status, decided_by").eq("short_id", m[1]).maybeSingle();
    if (!order) { await answer(cq.id, "Commande introuvable."); return json({ ok: true }); }
    const act = ACTION[m[2]];
    if (!act.from.includes(order.status)) {
      let who = ""; if (order.decided_by) { const { data } = await db.from("staff").select("name").eq("id", order.decided_by).maybeSingle(); who = data?.name || ""; }
      await answer(cq.id, `Déjà ${STATUS_LABEL[order.status].toLowerCase()}${who ? " par " + who : ""}.`); return json({ ok: true });
    }
    await applyDecision(db, order.id, act.to, { id: staff.id, name: staff.name }, "telegram");
    await answer(cq.id, act.label);
    return json({ ok: true });
  }

  const msg = upd.message || upd.channel_post;
  if (msg?.chat && typeof msg.text === "string") {
    const text: string = msg.text.trim(); const chat = msg.chat; const isPrivate = chat.type === "private";
    const cmd = text.split(/[\s@]/)[0].toLowerCase();
    if (cmd === "/start") {
      const code = text.split(/\s+/)[1] || "";
      if (!isPrivate) { await send(chat.id, "Ouvrez-moi en privé pour vous lier : t.me/<bot>?start=<votre code>."); return json({ ok: true }); }
      if (code) {
        const { data: st } = await db.from("staff").update({ telegram_chat_id: chat.id }).eq("link_code", code).eq("active", true).select("name, role").maybeSingle();
        if (st) { await send(chat.id, `Bonjour ${esc(st.name)} ! Vous recevrez ici vos demandes (${esc(st.role)}), vos rappels, et vous pouvez taper /agenda.`); return json({ ok: true }); }
        await send(chat.id, "Code inconnu. Demandez votre code de liaison à la réception (appli équipe, Réglages)."); return json({ ok: true });
      }
      const st = await staffByChat(db, chat.id);
      await send(chat.id, st ? `Bonjour ${esc(st.name)}, vous êtes déjà lié. Tapez /agenda.` : "Bonjour ! Pour vous lier à l'équipe : /start <code> (le code est dans l'appli équipe, Réglages).");
      return json({ ok: true });
    }
    if (cmd === "/id") {
      await send(chat.id, `Identifiant de ce chat : <code>${chat.id}</code>${msg.message_thread_id ? `\nSujet (topic) : <code>${msg.message_thread_id}</code>` : ""}`, { threadId: msg.message_thread_id });
      return json({ ok: true });
    }
    if (cmd === "/agenda") {
      const st = await staffByChat(db, msg.from?.id);
      if (!st) { await send(chat.id, "Liez-vous d'abord en privé : /start <code>.", { threadId: msg.message_thread_id }); return json({ ok: true }); }
      await send(chat.id, `🗓 <b>Agenda de ${esc(st.name)}</b>\n\n` + await agenda(db, st, tz), { threadId: msg.message_thread_id });
      return json({ ok: true });
    }
  }
  return json({ ok: true });
});
