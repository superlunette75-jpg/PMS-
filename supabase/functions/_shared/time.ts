// Dates locales (Africa/Casablanca par défaut) <-> UTC, et formats français pour les messages.

function offsetMs(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/* "2026-11-20" + "14:30" dans tz -> instant UTC. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let utc = guess - offsetMs(new Date(guess), tz);
  const o2 = offsetMs(new Date(utc), tz);
  if (guess - o2 !== utc) utc = guess - o2;
  return new Date(utc);
}

export function addMin(d: Date, min: number): Date { return new Date(d.getTime() + min * 60000); }

const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
function parts(d: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value || "";
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dow, y: get("year"), m: get("month"), d: get("day"), hh: get("hour"), mm: get("minute") };
}

/* "jeu. 20/11 à 14:30" */
export function fmtDateTime(d: Date, tz: string): string {
  const p = parts(d, tz); return `${DAYS[p.dow]} ${p.d}/${p.m} à ${p.hh}:${p.mm}`;
}
/* "jeu. 20/11/2026" */
export function fmtDay(d: Date, tz: string): string {
  const p = parts(d, tz); return `${DAYS[p.dow]} ${p.d}/${p.m}/${p.y}`;
}
export function fmtTime(d: Date, tz: string): string { const p = parts(d, tz); return `${p.hh}:${p.mm}`; }
/* "2026-11-20" local */
export function localDate(d: Date, tz: string): string { const p = parts(d, tz); return `${p.y}-${p.m}-${p.d}`; }
export function localHour(d: Date, tz: string): number { return Number(parts(d, tz).hh); }
export function localMinute(d: Date, tz: string): number { return Number(parts(d, tz).mm); }

export function frDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "";
}
