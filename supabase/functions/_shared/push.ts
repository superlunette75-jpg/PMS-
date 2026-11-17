// Notifications push Web (téléphone, ordinateur) sans dépendance : VAPID (RFC 8292) + chiffrement aes128gcm (RFC 8291).
// Secrets : VAPID_PUBLIC_KEY (clé publique brute en base64url), VAPID_PRIVATE_KEY (scalaire d en base64url), VAPID_SUBJECT.
import type { Db } from "./supabase.ts";

const enc = new TextEncoder();

function b64u(bytes: Uint8Array): string {
  let s = ""; bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64u(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function pushEnabled(): boolean {
  return !!(Deno.env.get("VAPID_PUBLIC_KEY") && Deno.env.get("VAPID_PRIVATE_KEY"));
}

let signingKey: CryptoKey | null = null;
async function vapidKey(): Promise<CryptoKey> {
  if (signingKey) return signingKey;
  const pub = fromB64u(Deno.env.get("VAPID_PUBLIC_KEY")!);
  const jwk = { kty: "EC", crv: "P-256", d: Deno.env.get("VAPID_PRIVATE_KEY")!, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true };
  signingKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return signingKey;
}

async function vapidHeader(endpoint: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: Deno.env.get("VAPID_SUBJECT") || "https://lamoun-equip.netlify.app" })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, await vapidKey(), enc.encode(header + "." + claims)));
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${Deno.env.get("VAPID_PUBLIC_KEY")}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8));
}

/* Chiffre le message pour un abonnement (RFC 8291, un seul enregistrement). */
async function encrypt(payload: Uint8Array, p256dh: string, auth: string): Promise<Uint8Array> {
  const uaPublic = fromB64u(p256dh), authSecret = fromB64u(auth);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

export type PushMessage = { title: string; body: string; url?: string; tag?: string };

/* Envoie à tous les appareils des membres donnés. Les abonnements expirés (404/410) sont supprimés. */
export async function pushTo(db: Db, staffIds: string[], msg: PushMessage): Promise<number> {
  if (!pushEnabled() || !staffIds.length) return 0;
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("staff_id", [...new Set(staffIds)]);
  let ok = 0;
  const body = enc.encode(JSON.stringify(msg));
  await Promise.all((subs || []).map(async (s: any) => {
    try {
      const res = await fetch(s.endpoint, {
        method: "POST",
        headers: { Authorization: await vapidHeader(s.endpoint), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high" },
        body: await encrypt(body, s.p256dh, s.auth),
      });
      if (res.status === 404 || res.status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      else if (res.ok) { ok++; await db.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", s.id); }
      else console.error("push", res.status, await res.text());
    } catch (e) { console.error("push", e); }
  }));
  return ok;
}

/* Les membres de la réception et les gérants (tous reçoivent les nouvelles demandes). */
export async function officeIds(db: Db): Promise<string[]> {
  const { data } = await db.from("staff").select("id").eq("active", true).in("access", ["manager", "reception"]);
  return (data || []).map((s: any) => s.id);
}
