// POST /account : crée ou met à jour le compte de connexion (identifiant + mot de passe) d'un membre de l'équipe.
// Appelant : un membre connecté. Les gérants gèrent tout le monde ; les autres seulement leur propre mot de passe.
// Corps : { staffId: uuid, username?: "mouna" | "mouna@…", password: "……" }
// Aucun e-mail n'est envoyé : l'identifiant sans @ devient <identifiant>@kasbahlamoun.app, un simple nom de compte.
import { json, error, preflight, readJson, str } from "../_shared/http.ts";
import { serviceClient, staffFromAuth } from "../_shared/supabase.ts";

const DOMAIN = "kasbahlamoun.app";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== "POST") return error("method", "POST attendu", 405);
  const db = serviceClient();
  const me = await staffFromAuth(db, req);
  if (!me) return error("auth", "Non autorisé", 401);
  const b = await readJson<{ staffId?: string; username?: string; password?: string }>(req);
  const staffId = str(b.staffId, 40), password = str(b.password, 200);
  if (!/^[0-9a-f-]{36}$/.test(staffId)) return error("input", "Membre inconnu.");
  if (me.access !== "manager" && me.id !== staffId) return error("auth", "Seuls les gérants gèrent les comptes des autres.", 403);
  if (password.length < 6) return error("password", "Mot de passe : 6 caractères minimum.");
  const { data: st } = await db.from("staff").select("id, name, email").eq("id", staffId).maybeSingle();
  if (!st) return error("input", "Membre inconnu.", 404);

  let username = str(b.username, 120).toLowerCase().trim() || st.email || "";
  if (!username) return error("username", "Choisissez un identifiant.");
  if (!username.includes("@")) {
    username = username.replace(/[^a-z0-9._-]/g, "");
    if (!username) return error("username", "Identifiant invalide : lettres, chiffres, point ou tiret.");
    username = username + "@" + DOMAIN;
  }

  // Compte Auth existant ? (par l'ancien e-mail du membre ou par le nouvel identifiant)
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
  const users = list?.users || [];
  const byNew = users.find((u) => (u.email || "").toLowerCase() === username);
  const byOld = st.email ? users.find((u) => (u.email || "").toLowerCase() === st.email!.toLowerCase()) : undefined;
  if (byNew && byOld && byNew.id !== byOld.id) return error("username", "Cet identifiant est déjà utilisé par un autre compte.", 409);
  const existing = byNew || byOld;
  let err;
  if (existing) ({ error: err } = await db.auth.admin.updateUserById(existing.id, { email: username, password, email_confirm: true }));
  else ({ error: err } = await db.auth.admin.createUser({ email: username, password, email_confirm: true }));
  if (err) { console.error(err); return error("auth_admin", "Création du compte impossible : " + err.message, 500); }

  // Un autre membre avait-il déjà cet identifiant ?
  const { data: clash } = await db.from("staff").select("id").ilike("email", username).neq("id", staffId).maybeSingle();
  if (clash) return error("username", "Cet identifiant est déjà pris par un autre membre.", 409);
  await db.from("staff").update({ email: username }).eq("id", staffId);
  return json({ ok: true, login: username.endsWith("@" + DOMAIN) ? username.slice(0, -DOMAIN.length - 1) : username });
});
