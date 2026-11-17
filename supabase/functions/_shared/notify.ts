// Messages Telegram (nouvelle commande, check-in, décision) et mise à jour des statuts.
import type { Db } from "./supabase.ts";
import { settingsMap } from "./supabase.ts";
import { send, edit, esc, waLink, tgEnabled, Button } from "./telegram.ts";
import { fmtDateTime, fmtDay, frDate } from "./time.ts";
import { pushTo, officeIds, pushEnabled } from "./push.ts";

export const KIND_LABEL: Record<string, string> = { transfer: "Transfert", spa: "Spa", dinner: "Dîner", concierge: "Conciergerie" };
export const KIND_EMOJI: Record<string, string> = { transfer: "🚗", spa: "🧖", dinner: "🍽", concierge: "🧭" };
export const STATUS_LABEL: Record<string, string> = { pending: "En attente", confirmed: "Confirmé", declined: "Refusé", cancelled: "Annulé", done: "Terminé" };
const LANG_FR: Record<string, string> = { fr: "français", en: "anglais", es: "espagnol", de: "allemand", ar: "arabe" };

export function roleFor(kind: string): string {
  return { transfer: "driver", spa: "spa", dinner: "kitchen", concierge: "guide" }[kind] || "reception";
}

export async function loadOrder(db: Db, orderId: string) {
  const { data: order } = await db.from("orders").select("*, guests(*), stays(*), order_items(*), events(*)").eq("id", orderId).maybeSingle();
  return order;
}

function guestLine(o: any): string {
  const g = o.guests || {}; const name = [g.first_name, g.last_name].filter(Boolean).join(" ") || o.details?.guestName || "Client";
  const suite = o.stays?.suite || o.details?.suite || "";
  const phone = g.phone_e164 || "";
  return `👤 ${esc(name)}${suite ? " · Suite " + esc(suite) : ""}${phone ? " · 📱 " + esc(phone) : ""}`;
}

/* Texte de confirmation pré-écrit pour le client, dans sa langue, à envoyer d'un geste depuis WhatsApp. */
export function guestConfirmText(o: any, tz: string): string {
  const g = o.guests || {}; const first = g.first_name || "";
  const ev = (o.events || []).filter((e: any) => e.kind === "order").sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at))[0];
  const when = ev ? fmtDateTime(new Date(ev.starts_at), tz) : "";
  const what: Record<string, Record<string, string>> = {
    fr: { transfer: "votre transfert", spa: "votre rendez-vous au spa", dinner: "votre dîner", concierge: "votre demande" },
    en: { transfer: "your transfer", spa: "your spa appointment", dinner: "your dinner", concierge: "your request" },
    es: { transfer: "su traslado", spa: "su cita en el spa", dinner: "su cena", concierge: "su solicitud" },
    de: { transfer: "Ihr Transfer", spa: "Ihr Spa-Termin", dinner: "Ihr Abendessen", concierge: "Ihre Anfrage" },
    ar: { transfer: "نقلكم", spa: "موعدكم في السبا", dinner: "عشاءكم", concierge: "طلبكم" },
  };
  const t: Record<string, string> = {
    fr: `Bonjour ${first}, Kasbah La Moun : ${what.fr[o.kind]}${when ? " (" + when + ")" : ""} est confirmé. À très bientôt !`,
    en: `Hello ${first}, Kasbah La Moun here: ${what.en[o.kind]}${when ? " (" + when + ")" : ""} is confirmed. See you soon!`,
    es: `Hola ${first}, Kasbah La Moun: ${what.es[o.kind]}${when ? " (" + when + ")" : ""} está confirmado. ¡Hasta pronto!`,
    de: `Hallo ${first}, Kasbah La Moun: ${what.de[o.kind]}${when ? " (" + when + ")" : ""} ist bestätigt. Bis bald!`,
    ar: `مرحباً ${first}، قصبة لا مون: تم تأكيد ${what.ar[o.kind]}${when ? " (" + when + ")" : ""}. إلى اللقاء قريباً!`,
  };
  return t[o.lang] || t.fr;
}

export function orderHtml(o: any, tz: string, extra: string[] = []): string {
  const L: string[] = [];
  L.push(`${KIND_EMOJI[o.kind] || "•"} <b>${esc(KIND_LABEL[o.kind] || o.kind).toUpperCase()}</b> · n° ${esc(o.short_id)}`);
  const evs = (o.events || []).filter((e: any) => e.kind === "order").sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at));
  evs.forEach((e: any) => {
    const mins = Math.round((new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 60000);
    L.push(`🗓 ${esc(e.title)} : ${fmtDateTime(new Date(e.starts_at), tz)}${o.kind === "spa" ? " (" + mins + " min)" : ""}`);
  });
  L.push(guestLine(o));
  if (o.lang && o.lang !== "fr") L.push(`Langue du client : ${LANG_FR[o.lang] || o.lang}`);
  const d = o.details || {};
  if (o.kind === "transfer") {
    if (d.flight) L.push(`✈️ Vol ${esc(String(d.flight).toUpperCase())}${d.people ? " · " + d.people + " pers." : ""}`);
    if (d.round && d.backFlight) L.push(`↩️ Retour vol ${esc(String(d.backFlight).toUpperCase())} · départ du riad ${frDate(d.backDate)}${d.backTime ? " à " + d.backTime : ""}`);
  }
  if (o.kind === "dinner") {
    if (d.guests) L.push(`🍽 ${d.guests} convives`);
    if (d.allergies) L.push(`Allergies, préférences : ${esc(d.allergies)}`);
  }
  if (o.kind === "concierge") {
    if (d.people) L.push(`👥 ${d.people} personnes`);
    if (d.details) L.push(`Précisions : ${esc(d.details)}`);
  }
  (o.order_items || []).forEach((it: any) => {
    L.push(`• ${it.qty} x ${esc(it.label_fr)}${it.unit_price_mad ? " : " + it.unit_price_mad * it.qty + " MAD" : ""}`);
  });
  if (o.total_mad) L.push(`<b>Total : ${o.total_mad} MAD</b>`);
  if (o.notes) L.push(`Remarques : ${esc(o.notes)}`);
  extra.forEach((x) => L.push(x));
  L.push(`Statut : <b>${esc(STATUS_LABEL[o.status] || o.status)}</b>${o.decided_by_name ? " par " + esc(o.decided_by_name) : ""}`);
  return L.join("\n");
}

function buttons(o: any, tz: string): Button[][] {
  const rows: Button[][] = [];
  if (o.status === "pending") rows.push([{ text: "✅ Accepter", callback_data: `o:${o.short_id}:ok` }, { text: "❌ Refuser", callback_data: `o:${o.short_id}:no` }]);
  else if (o.status === "confirmed") rows.push([{ text: "✔️ Terminé", callback_data: `o:${o.short_id}:done` }, { text: "Annuler", callback_data: `o:${o.short_id}:cancel` }]);
  const phone = o.guests?.phone_e164;
  if (phone) rows.push([{ text: "💬 WhatsApp le client", url: waLink(phone, o.status === "confirmed" ? guestConfirmText(o, tz) : "") }]);
  return rows;
}

/* Envoi d'une nouvelle commande : à la personne du métier, à la réception, et au groupe (sujet du métier). */
/* Résumé court pour une notification push : « 🚗 Transfert · Jean Dupont » / « mar. 18/11 14:30 · Suite 4 ». */
function pushSummary(o: any, tz: string, prefix = ""): { title: string; body: string } {
  const g = o.guests || {}; const name = [g.first_name, g.last_name].filter(Boolean).join(" ") || o.details?.guestName || "Client";
  const ev = (o.events || []).filter((e: any) => e.kind === "order").sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at))[0];
  const suite = o.stays?.suite || o.details?.suite;
  return {
    title: `${prefix}${KIND_EMOJI[o.kind] || "•"} ${KIND_LABEL[o.kind] || o.kind} · ${name}`,
    body: [ev ? fmtDateTime(new Date(ev.starts_at), tz) : "", suite ? "Suite " + suite : "", o.status === "pending" ? "à accepter" : STATUS_LABEL[o.status] || ""].filter(Boolean).join(" · "),
  };
}

/* Qui doit être prévenu d'une commande : la personne du créneau, sinon le métier, plus la réception et les gérants. */
async function orderAudience(db: Db, o: any): Promise<string[]> {
  const assigned = (o.events || []).map((e: any) => e.staff_id).filter(Boolean);
  let ids = [...assigned];
  if (!assigned.length) {
    const { data } = await db.from("staff").select("id").eq("active", true).eq("role", roleFor(o.kind));
    ids = ids.concat((data || []).map((s: any) => s.id));
  }
  return ids.concat(await officeIds(db));
}

export async function notifyNewOrder(db: Db, orderId: string, extra: string[] = []) {
  const o = await loadOrder(db, orderId); if (!o) return;
  const s = await settingsMap(db); const tz = s.timezone || "Africa/Casablanca";
  if (pushEnabled()) await pushTo(db, await orderAudience(db, o), { ...pushSummary(o, tz, "Nouvelle demande · "), url: "#demandes", tag: "order-" + o.id });
  if (!tgEnabled()) return;
  const html = orderHtml(o, tz, extra); const kb = buttons(o, tz);
  const { data: staff } = await db.from("staff").select("id, role, telegram_chat_id").eq("active", true).not("telegram_chat_id", "is", null)
    .in("role", [roleFor(o.kind), "reception"]);
  const rows: Record<string, unknown>[] = [];
  for (const st of staff || []) {
    const m = await send(st.telegram_chat_id, html, { keyboard: kb });
    if (m) rows.push({ order_id: o.id, staff_id: st.id, chat_id: st.telegram_chat_id, message_id: m.message_id, kind: "new" });
  }
  if (s.telegram_group_id) {
    const m = await send(s.telegram_group_id, html, { keyboard: kb, threadId: s["topic_" + o.kind] || undefined });
    if (m) rows.push({ order_id: o.id, chat_id: s.telegram_group_id, message_id: m.message_id, kind: "new" });
  }
  if (rows.length) await db.from("notifications").insert(rows);
}

/* Changement de statut (Telegram ou appli équipe) : commande, créneaux, puis édition de tous les messages envoyés. */
export async function applyDecision(db: Db, orderId: string, status: string, staff: { id: string; name: string } | null, via: string) {
  await db.from("orders").update({ status, decided_by: staff?.id || null, decided_at: new Date().toISOString(), decided_via: via }).eq("id", orderId);
  await db.from("events").update({ status }).eq("order_id", orderId);
  const o = await loadOrder(db, orderId); if (!o) return null;
  if (staff) o.decided_by_name = staff.name;
  else if (o.decided_by) { const { data } = await db.from("staff").select("name").eq("id", o.decided_by).maybeSingle(); o.decided_by_name = data?.name; }
  if (tgEnabled()) {
    const tz = (await settingsMap(db)).timezone || "Africa/Casablanca";
    const html = orderHtml(o, tz); const kb = buttons(o, tz);
    const { data: msgs } = await db.from("notifications").select("chat_id, message_id").eq("order_id", orderId).eq("kind", "new");
    for (const m of msgs || []) if (m.chat_id && m.message_id) await edit(m.chat_id, m.message_id, html, kb);
  }
  return o;
}

export async function notifyCheckin(db: Db, stayId: string) {
  const { data: st } = await db.from("stays").select("*, guests(*)").eq("id", stayId).maybeSingle(); if (!st) return;
  const s = await settingsMap(db); const g = st.guests || {};
  const name = [g.first_name, g.last_name].filter(Boolean).join(" ");
  if (pushEnabled()) await pushTo(db, await officeIds(db), { title: "🔑 Check-in en ligne · " + name, body: `Arrivée ${frDate(st.arrival)} · ${st.people} pers.${st.transfer_wish === "yes" ? " · transfert souhaité" : ""}`, url: "#jour", tag: "stay-" + st.id });
  if (!tgEnabled()) return;
  const L = [
    `🔑 <b>CHECK-IN EN LIGNE</b>`,
    `👤 ${esc(name)}${g.phone_e164 ? " · 📱 " + esc(g.phone_e164) : ""}${g.email ? " · " + esc(g.email) : ""}`,
    `🗓 Arrivée ${frDate(st.arrival)} → départ ${frDate(st.departure)} · ${st.people} voyageur(s)${st.suite ? " · Suite " + esc(st.suite) : ""}`,
    `${esc(g.nationality || "")}${g.country ? " · " + esc(g.country) : ""}${g.city ? " · " + esc(g.city) : ""}`,
    `Transfert aéroport : ${esc(st.transfer_wish || "?")}${st.flight_out ? " · vol retour " + String(st.flight_out).slice(0, 5) : ""}${st.checkout_time ? " · départ riad " + String(st.checkout_time).slice(0, 5) : ""}`,
    `Motif : ${esc(st.purpose || "")}${st.purpose_other ? " (" + esc(st.purpose_other) + ")" : ""} · Connu via : ${esc(st.source || "")}${st.source_other ? " (" + esc(st.source_other) + ")" : ""}`,
    `Langue : ${LANG_FR[g.lang] || g.lang || "français"} · Offres privées : ${g.offers_optin ? "oui" : "non"}`,
  ].filter((l) => l.trim());
  const kb: Button[][] = g.phone_e164 ? [[{ text: "💬 WhatsApp le client", url: waLink(g.phone_e164, "") }]] : [];
  const html = L.join("\n");
  const { data: staff } = await db.from("staff").select("id, telegram_chat_id").eq("active", true).eq("role", "reception").not("telegram_chat_id", "is", null);
  const rows: Record<string, unknown>[] = [];
  for (const r of staff || []) { const m = await send(r.telegram_chat_id, html, { keyboard: kb }); if (m) rows.push({ staff_id: r.id, chat_id: r.telegram_chat_id, message_id: m.message_id, kind: "checkin" }); }
  if (s.telegram_group_id) { const m = await send(s.telegram_group_id, html, { keyboard: kb, threadId: s.topic_checkin || undefined }); if (m) rows.push({ chat_id: s.telegram_group_id, message_id: m.message_id, kind: "checkin" }); }
  if (rows.length) await db.from("notifications").insert(rows);
}

/* Attribution d'une commande à un membre (appli équipe) : message privé Telegram avec les boutons, et push. */
export async function notifyAssigned(db: Db, orderId: string, staffId: string, byName: string) {
  const o = await loadOrder(db, orderId); if (!o) return;
  const s = await settingsMap(db); const tz = s.timezone || "Africa/Casablanca";
  if (pushEnabled()) await pushTo(db, [staffId], { ...pushSummary(o, tz, "Pour vous · "), url: "#planning", tag: "order-" + o.id });
  if (!tgEnabled()) return;
  const { data: st } = await db.from("staff").select("telegram_chat_id").eq("id", staffId).maybeSingle();
  if (!st?.telegram_chat_id) return;
  const m = await send(st.telegram_chat_id, orderHtml(o, tz, [`👉 Attribué à vous par ${esc(byName)}`]), { keyboard: buttons(o, tz) });
  if (m) await db.from("notifications").insert({ order_id: o.id, staff_id: staffId, chat_id: st.telegram_chat_id, message_id: m.message_id, kind: "new" });
}

export { fmtDay };
