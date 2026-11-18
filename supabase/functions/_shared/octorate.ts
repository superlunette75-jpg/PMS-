// Lecture des e-mails de réservation Octorate et des calendriers iCal.
// Le format exact des e-mails n'est pas documenté publiquement : l'analyse cherche les libellés usuels
// (français, anglais, italien, espagnol). Un e-mail mal compris reste « à vérifier » dans l'appli,
// avec son texte complet, et peut être réanalysé quand les règles sont ajustées.

export type ParsedMail = {
  kind: "new" | "modified" | "cancelled";
  ref?: string;
  otaRef?: string;
  channel?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  arrival?: string;
  departure?: string;
  eta?: string;
  roomType?: string;
  rooms?: string;
  adults?: number;
  children?: number;
  total?: number;
  currency?: string;
  notes?: string;
  missing: string[];
};

/* ---------- Texte ---------- */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h\d|table)>/gi, "\n").replace(/<\/t[dh]>/gi, "\t")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[  ]+/g, " ").replace(/\t[ \t]*/g, "\t").replace(/\n\s*\n+/g, "\n").trim();
}

/* ---------- Dates ---------- */
const MONTHS: Record<string, number> = {
  jan: 1, janv: 1, gen: 1, ene: 1, feb: 2, fev: 2, "fév": 2, febr: 2, "mär": 3, mar: 3, mars: 3, apr: 4, avr: 4, abr: 4, may: 5, mai: 5, mag: 5,
  jun: 6, juin: 6, giu: 6, jul: 7, juil: 7, lug: 7, aug: 8, aou: 8, "aoû": 8, ago: 8, sep: 9, set: 9, oct: 10, ott: 10, okt: 10, nov: 11, dec: 12, "déc": 12, dic: 12, dez: 12,
};
function monthOf(w: string): number | undefined {
  const s = w.toLowerCase().replace(/\.$/, "");
  return MONTHS[s.slice(0, 4)] || MONTHS[s.slice(0, 3)];
}
function iso(y: number, m: number, d: number): string | undefined {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2020 || y > 2100) return undefined;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
/* Premier date trouvée dans un bout de texte (jj/mm/aaaa par défaut : format marocain et européen). */
export function findDate(s: string): string | undefined {
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return iso(+m[1], +m[2], +m[3]);
  m = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(s); if (m) return iso(+m[3], +m[2], +m[1]);
  m = /(\d{1,2})(?:er)?\s+([A-Za-zÀ-ÿ]{3,9})\.?,?\s+(\d{4})/.exec(s); if (m && monthOf(m[2])) return iso(+m[3], monthOf(m[2])!, +m[1]);
  m = /([A-Za-zÀ-ÿ]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(s); if (m && monthOf(m[1])) return iso(+m[3], monthOf(m[1])!, +m[2]);
  return undefined;
}
function addDays(d: string, n: number): string { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
export function nightsBetween(a: string, b: string): number { return Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / 86400000); }

/* ---------- Libellés ---------- */
function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
/* Valeur qui suit un des libellés (sur la même ligne, après « : », tabulation ou espace), ou sur la ligne suivante. */
function field(text: string, labels: string[]): string | undefined {
  const lines = text.split("\n");
  for (const label of labels) {
    const head = "(?:^|[\\s\\t|•*])" + esc(label) + "\\s*(?:\\([^)]*\\))?";
    const withValue = new RegExp(head + "(?:\\s*[:：\\t]|\\s[\\-–]\\s|\\s{2,})\\s*(.+)$", "i");   // « Libellé : valeur »
    const alone = new RegExp(head + "\\s*[:：]?\\s*$", "i");                                          // valeur à la ligne suivante
    for (let i = 0; i < lines.length; i++) {
      const m = withValue.exec(lines[i]);
      if (m && m[1].trim()) return m[1].replace(/^[:\t\s\-–]+/, "").trim();
      if (alone.test(lines[i])) { const next = (lines[i + 1] || "").trim(); if (next) return next; }
    }
  }
  return undefined;
}
function number(v?: string): number | undefined {
  if (!v) return undefined;
  const m = /-?\d[\d\s.,']*/.exec(v); if (!m) return undefined;
  let s = m[0].replace(/[\s']/g, "");
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");   // 1.234,56
  else s = s.replace(/,/g, "");                                          // 1,234.56
  const n = parseFloat(s); return Number.isFinite(n) ? n : undefined;
}
function currencyOf(v?: string): string | undefined {
  if (!v) return undefined;
  if (/€|\bEUR\b|\beuros?\b/i.test(v)) return "EUR"; if (/\$|\bUSD\b/i.test(v)) return "USD"; if (/£|\bGBP\b/i.test(v)) return "GBP";
  if (/\bMAD\b|\bDH\b|\bdhs?\b|dirham/i.test(v)) return "MAD"; return undefined;
}

/* « Suite prestige 4 », « Camera 4 », « Deluxe », « Royal 7 » -> nom de suite comme dans Little Hotel. */
export function suiteName(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  const n = /(?:suite|room|chambre|camera|n[°o.]?)\s*(\d{1,2})\b/.exec(s)?.[1] || /\b([1-8])\b/.exec(s)?.[1];
  if (/deluxe/.test(s) && (!n || n === "1")) return "Deluxe";
  if (!n) return undefined;
  return suiteFromNumber(Number(n));
}
export function suiteFromNumber(n: number): string | undefined {
  if (!(n >= 1 && n <= 8)) return undefined;
  return n === 1 ? "Deluxe" : n === 7 ? "Suite Royal 7" : "Suite prestige " + n;
}

const CHANNELS: [RegExp, string][] = [[/booking\.com|booking com/i, "Booking.com"], [/expedia|hotels\.com/i, "Expedia"], [/airbnb/i, "Airbnb"], [/agoda/i, "Agoda"], [/hotelbeds/i, "Hotelbeds"], [/trip\.com|ctrip/i, "Trip.com"], [/google/i, "Google"], [/\b(?:direct|diretta|directe|website|site web|sito)\b/i, "Direct Booking"]];

export function parseMail(subject: string, rawText: string): ParsedMail {
  const text = /<\w+[^>]*>/.test(rawText) ? htmlToText(rawText) : rawText.replace(/\r/g, "");
  const all = subject + "\n" + text;
  const out: ParsedMail = { kind: "new", missing: [] };
  if (/annul|cancel|storn|cancellazion|cancelación/i.test(subject) || /\b(?:annulée|cancelled|canceled|cancellata|cancelada)\b/i.test(text.slice(0, 400))) out.kind = "cancelled";
  else if (/modif|chang|variazion|update|aggiorn/i.test(subject)) out.kind = "modified";

  for (const [re, name] of CHANNELS) if (re.test(field(text, ["Canal", "Channel", "Canale", "Source", "Fonte", "Portal", "OTA"]) || "") || re.test(subject)) { out.channel = name; break; }
  if (!out.channel) for (const [re, name] of CHANNELS) if (re.test(text)) { out.channel = name; break; }

  const refRaw = field(text, ["Numéro de réservation", "N° de réservation", "Référence de réservation", "Référence", "Reservation number", "Reservation ID", "Booking number", "Booking ID", "Booking reference", "Confirmation number", "Numero prenotazione", "ID prenotazione", "Prenotazione n", "Codice prenotazione", "Número de reserva", "Res. ID", "ID"]);
  const refM = /([A-Z0-9][A-Z0-9\-_]{3,})/i.exec(refRaw || "") || /(?:#|n[°o]\s?)\s?([A-Z0-9\-]{5,})/i.exec(subject);
  if (refM) out.ref = refM[1];
  const otaRaw = field(text, ["Booking.com ID", "Expedia ID", "Airbnb ID", "Channel reservation", "Channel ID", "OTA ID", "Riferimento canale", "Référence canal", "Codice OTA"]);
  const otaM = /([A-Z0-9][A-Z0-9\-]{4,})/i.exec(otaRaw || ""); if (otaM) out.otaRef = otaM[1];

  const guest = field(text, ["Nom du client", "Nom du voyageur", "Client", "Guest name", "Guest", "Booker", "Nome ospite", "Ospite", "Cliente", "Nombre del huésped", "Huésped", "Name", "Nome", "Nom"]);
  if (guest && !/^\d+$/.test(guest)) {
    const g = guest.replace(/\s{2,}.*/, "").replace(/[,;|].*$/, "").trim();
    const parts = g.split(/\s+/);
    if (parts.length > 1) { out.firstName = parts.slice(0, -1).join(" "); out.lastName = parts[parts.length - 1]; } else out.lastName = g;
  }
  const mail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi.exec(text.split("\n").filter((l) => !/octorate|noreply|no-reply/i.test(l)).join("\n"));
  if (mail) out.email = mail[0];
  const phone = field(text, ["Téléphone", "Telephone", "Phone", "Telefono", "Teléfono", "Mobile", "Cellulare", "Tél", "Tel"]);
  if (phone && /\d{6,}/.test(phone.replace(/\D/g, ""))) out.phone = phone.replace(/[^\d+ ]/g, "").trim();

  out.arrival = findDate(field(text, ["Date d'arrivée", "Arrivée", "Check-in", "Check in", "Checkin", "Arrival date", "Arrival", "Data di arrivo", "Arrivo", "Data arrivo", "Llegada", "Fecha de llegada", "Anreise"]) || "");
  out.departure = findDate(field(text, ["Date de départ", "Départ", "Check-out", "Check out", "Checkout", "Departure date", "Departure", "Data di partenza", "Partenza", "Data partenza", "Salida", "Fecha de salida", "Abreise"]) || "");
  if (!out.arrival || !out.departure) {
    const span = /(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-zÀ-ÿ]{3,9}\.?\s+\d{4})\s*(?:-|–|→|>|au|to|al|until|bis)\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-zÀ-ÿ]{3,9}\.?\s+\d{4})/i.exec(all);
    if (span) { out.arrival ||= findDate(span[1]); out.departure ||= findDate(span[2]); }
  }
  const nightsRaw = number(field(text, ["Nuits", "Nights", "Notti", "Noches"]));
  if (out.arrival && !out.departure && nightsRaw) out.departure = addDays(out.arrival, nightsRaw);
  if (out.arrival && out.departure && out.departure <= out.arrival) out.departure = undefined;
  const eta = field(text, ["Heure d'arrivée", "Arrival time", "Estimated arrival", "Orario di arrivo", "Ora di arrivo", "Hora de llegada"]);
  const etaM = /(\d{1,2})[:h.](\d{2})/.exec(eta || ""); if (etaM) out.eta = `${etaM[1].padStart(2, "0")}:${etaM[2]}`;

  out.roomType = field(text, ["Type de chambre", "Chambre", "Room type", "Room", "Unit", "Tipologia camera", "Tipologia", "Camera", "Alloggio", "Habitación", "Accommodation", "Suite"]);
  out.rooms = suiteName(out.roomType);
  out.adults = number(field(text, ["Adultes", "Adults", "Adulti", "Adultos"]));
  if (out.adults == null) out.adults = number(field(text, ["Personnes", "Persons", "Guests", "Pax", "Ospiti", "Persone", "Personas", "Occupants"]));
  out.children = number(field(text, ["Enfants", "Children", "Kids", "Bambini", "Niños"])) ?? 0;
  const totalRaw = field(text, ["Montant total", "Prix total", "Total price", "Total amount", "Grand total", "Importo totale", "Prezzo totale", "Totale", "Precio total", "Total"]);
  out.total = number(totalRaw); out.currency = currencyOf(totalRaw) || currencyOf(text.slice(0, 2000)) || (out.total != null ? "MAD" : undefined);
  const notes = field(text, ["Remarques", "Commentaires", "Demandes spéciales", "Special requests", "Notes", "Note", "Comments", "Richieste", "Comentarios"]);
  if (notes && notes.length > 2) out.notes = notes.slice(0, 500);

  if (!out.ref) out.missing.push("référence");
  if (!out.arrival) out.missing.push("arrivée");
  if (!out.departure && out.kind !== "cancelled") out.missing.push("départ");
  return out;
}

/* Référence au format Little Hotel quand c'est une réservation Booking ou Expedia (évite les doublons). */
export function canonicalRef(p: ParsedMail): string | undefined {
  const ota = p.otaRef || (p.ref && /^\d{8,12}$/.test(p.ref) ? p.ref : undefined);
  if (ota && /^\d+$/.test(ota) && p.channel === "Booking.com") return "BDC-" + ota;
  if (ota && /^\d+$/.test(ota) && p.channel === "Expedia") return "EXP-" + ota;
  return p.ref ? "OCT-" + p.ref : undefined;
}

/* ---------- iCal ---------- */
export type IcalEvent = { uid: string; start: string; end: string; summary: string; description: string };
export function parseIcal(raw: string): IcalEvent[] {
  const lines = raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const out: IcalEvent[] = []; let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur) {
        const start = icalDate(cur.DTSTART), end = icalDate(cur.DTEND) || (start ? addDays(start, 1) : undefined);
        if (start && end && end > start) out.push({ uid: cur.UID || start + (cur.SUMMARY || ""), start, end, summary: unescapeIcal(cur.SUMMARY || ""), description: unescapeIcal(cur.DESCRIPTION || "") });
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const i = line.indexOf(":"); if (i < 0) continue;
    const key = line.slice(0, i).split(";")[0].toUpperCase(); cur[key] = line.slice(i + 1);
  }
  return out;
}
function icalDate(v?: string): string | undefined { const m = /^(\d{4})(\d{2})(\d{2})/.exec(v || ""); return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined; }
function unescapeIcal(s: string) { return s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim(); }
/* Événement de fermeture (pas un client) : « Not available », « Closed », « Blocked »… */
export function isBlock(e: IcalEvent): boolean { return /not available|unavailable|closed|blocked|block|chiuso|non disponibile|fermé|indisponible|bloqué/i.test(e.summary); }
