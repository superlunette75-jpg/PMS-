// GET /availability?kind=spa&date=2026-11-20&duration=105 -> créneaux libres (heure locale), sans donnée personnelle.
import { json, error, preflight, str, int, isDate } from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const u = new URL(req.url);
  const kind = str(u.searchParams.get("kind")), date = str(u.searchParams.get("date"), 10);
  const duration = int(u.searchParams.get("duration"), 60, 15, 600);
  if (!["spa", "dining", "guide", "vehicle"].includes(kind)) return error("kind", "Type de ressource inconnu.");
  if (!isDate(date)) return error("date", "Date invalide.");
  const db = serviceClient();
  const { data, error: e } = await db.rpc("free_slots", { p_kind: kind, p_date: date, p_duration_min: duration });
  if (e) { console.error(e); return error("db", "Disponibilités indisponibles.", 500); }
  const seen = new Set<string>(); const slots: { start: string; label: string; resourceId: string }[] = [];
  for (const r of data || []) { if (seen.has(r.label)) continue; seen.add(r.label); slots.push({ start: r.starts_at, label: r.label, resourceId: r.resource_id }); }
  return json({ ok: true, kind, date, duration, slots }, 200, { "Cache-Control": "no-store" });
});
