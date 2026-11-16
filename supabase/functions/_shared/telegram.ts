// Appels à l'API Bot Telegram. Le jeton vient de l'environnement, jamais du dépôt.

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

export function tgEnabled(): boolean { return !!TOKEN; }

export async function tg(method: string, body: Record<string, unknown>): Promise<Record<string, any> | null> {
  if (!TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!j.ok) console.error("telegram", method, j.description);
    return j.ok ? j.result : null;
  } catch (e) { console.error("telegram", method, e); return null; }
}

export function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type Button = { text: string; url?: string; callback_data?: string };

export function keyboard(rows: Button[][]) { return { inline_keyboard: rows }; }

export async function send(chatId: number | string, html: string, opts: { keyboard?: Button[][]; threadId?: string | number } = {}) {
  const body: Record<string, unknown> = { chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true };
  if (opts.keyboard) body.reply_markup = keyboard(opts.keyboard);
  if (opts.threadId) body.message_thread_id = Number(opts.threadId);
  return await tg("sendMessage", body);
}

export async function edit(chatId: number | string, messageId: number | string, html: string, rows?: Button[][]) {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text: html, parse_mode: "HTML", disable_web_page_preview: true };
  body.reply_markup = keyboard(rows || []);
  return await tg("editMessageText", body);
}

export async function answer(callbackId: string, text = "") {
  return await tg("answerCallbackQuery", { callback_query_id: callbackId, text });
}

export function waLink(phone: string, text: string): string {
  return "https://wa.me/" + phone.replace(/[^\d]/g, "") + (text ? "?text=" + encodeURIComponent(text) : "");
}
