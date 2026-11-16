import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export type Db = SupabaseClient;

/* Client avec la clé service : réservé aux fonctions, jamais exposé au navigateur. */
export function serviceClient(): Db {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function setting(db: Db, key: string, def = ""): Promise<string> {
  const { data } = await db.from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value ?? def) || def;
}

export async function settingsMap(db: Db): Promise<Record<string, string>> {
  const { data } = await db.from("settings").select("key, value");
  const m: Record<string, string> = {};
  (data || []).forEach((r: { key: string; value: string | null }) => { m[r.key] = r.value || ""; });
  return m;
}

/* Membre de l'équipe derrière un jeton Auth (appli équipe). null si inconnu. */
export async function staffFromAuth(db: Db, req: Request) {
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data: userData } = await db.auth.getUser(jwt);
  const email = userData?.user?.email;
  if (!email) return null;
  const { data } = await db.from("staff").select("*").ilike("email", email).eq("active", true).maybeSingle();
  return data;
}
