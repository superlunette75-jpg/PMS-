// POST /status : l'appli équipe change le statut d'une commande, ou l'attribue à un membre. Met à jour Telegram et le push.
// Corps : { orderId: uuid, status?: confirmed|declined|cancelled|done|pending, assignTo?: uuid | "" }
// Réception et gérants : toutes les commandes. Membres « métier » : seulement leurs créneaux
// (ou ceux de leur métier encore attribués à personne), et pas d'attribution.
import { json, error, preflight, readJson, str } from "../_shared/http.ts";
import { serviceClient, staffFromAuth } from "../_shared/supabase.ts";
import { applyDecision, notifyAssigned, roleFor } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== "POST") return error("method", "POST attendu", 405);
  const db = serviceClient();
  const staff = await staffFromAuth(db, req);
  if (!staff) return error("auth", "Non autorisé", 401);
  const b = await readJson<{ orderId?: string; status?: string; assignTo?: string | null }>(req);
  const id = str(b.orderId, 40), status = str(b.status, 20);
  if (!/^[0-9a-f-]{36}$/.test(id)) return error("input", "Paramètres invalides.");
  const office = staff.access === "manager" || staff.access === "reception";

  const { data: order } = await db.from("orders").select("id, kind, events(id, staff_id)").eq("id", id).maybeSingle();
  if (!order) return error("notfound", "Commande introuvable.", 404);

  if (!office) {
    const evs = (order.events || []) as { staff_id: string | null }[];
    const mine = evs.some((e) => e.staff_id === staff.id) || (evs.every((e) => !e.staff_id) && roleFor(order.kind) === staff.role);
    if (!mine) return error("auth", "Cette demande n'est pas dans votre planning.", 403);
    if (b.assignTo !== undefined) return error("auth", "Seules la réception et la gérance attribuent les demandes.", 403);
  }

  if (b.assignTo !== undefined) {
    const to = str(b.assignTo || "", 40) || null;
    if (to && !/^[0-9a-f-]{36}$/.test(to)) return error("input", "Membre inconnu.");
    await db.from("events").update({ staff_id: to }).eq("order_id", id);
    if (to) await notifyAssigned(db, id, to, staff.name);
    if (!status) return json({ ok: true, assigned: to });
  }

  if (!["confirmed", "declined", "cancelled", "done", "pending"].includes(status)) return error("input", "Statut invalide.");
  const o = await applyDecision(db, id, status, { id: staff.id, name: staff.name }, "admin");
  if (!o) return error("notfound", "Commande introuvable.", 404);
  return json({ ok: true, status: o.status });
});
