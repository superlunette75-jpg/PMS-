// POST /push { test: true } : envoie une notification de test sur les appareils du membre connecté.
import { json, error, preflight, readJson } from "../_shared/http.ts";
import { serviceClient, staffFromAuth } from "../_shared/supabase.ts";
import { pushTo, pushEnabled } from "../_shared/push.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== "POST") return error("method", "POST attendu", 405);
  const db = serviceClient();
  const me = await staffFromAuth(db, req);
  if (!me) return error("auth", "Non autorisé", 401);
  if (!pushEnabled()) return error("push", "Notifications push non configurées (clés VAPID).", 500);
  const b = await readJson<{ test?: boolean }>(req);
  if (!b.test) return error("input", "Rien à faire.");
  const sent = await pushTo(db, [me.id], { title: "🔔 La Moun", body: `Bonjour ${me.name}, les notifications fonctionnent sur cet appareil.`, url: "", tag: "test" });
  return json({ ok: true, sent });
});
