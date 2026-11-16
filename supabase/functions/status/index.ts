// POST /status : l'appli équipe change le statut d'une commande (jeton Auth d'un membre). Met à jour les messages Telegram.
// Corps : { orderId: uuid, status: confirmed|declined|cancelled|done }
import { json, error, preflight, readJson, str } from "../_shared/http.ts";
import { serviceClient, staffFromAuth } from "../_shared/supabase.ts";
import { applyDecision } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== "POST") return error("method", "POST attendu", 405);
  const db = serviceClient();
  const staff = await staffFromAuth(db, req);
  if (!staff) return error("auth", "Non autorisé", 401);
  const b = await readJson<{ orderId?: string; status?: string }>(req);
  const id = str(b.orderId, 40), status = str(b.status, 20);
  if (!/^[0-9a-f-]{36}$/.test(id) || !["confirmed", "declined", "cancelled", "done", "pending"].includes(status)) return error("input", "Paramètres invalides.");
  const o = await applyDecision(db, id, status, { id: staff.id, name: staff.name }, "admin");
  if (!o) return error("notfound", "Commande introuvable.", 404);
  return json({ ok: true, status: o.status });
});
