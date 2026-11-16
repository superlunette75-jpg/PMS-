// Réponses JSON + CORS pour les fonctions appelées depuis le guide (autre domaine).
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...extra },
  });
}

export function error(code: string, message: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, code, message, ...extra }, status);
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  return null;
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return await req.json() as T; } catch { return {} as T; }
}

export function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : v == null ? "" : String(v).slice(0, max);
}
export function int(v: unknown, def = 0, min = -1e9, max = 1e9): number {
  const n = Number(v); if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.round(n)));
}
export function isDate(v: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(v); }
export function isTime(v: string): boolean { return /^\d{2}:\d{2}$/.test(v); }

/* Numéro en E.164 approximatif : garde + et chiffres ; 00 -> + ; 0X marocain -> +212. */
export function phoneE164(raw: string): string {
  let s = (raw || "").replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^0[5-7]\d{8}$/.test(s)) s = "+212" + s.slice(1);
  if (s && !s.startsWith("+")) s = "+" + s;
  return s.length >= 8 ? s : "";
}
