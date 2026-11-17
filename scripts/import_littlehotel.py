#!/usr/bin/env python3
"""Import initial des exports CSV Little Hotel dans Supabase (tables lh_*).

Usage : python3 -I scripts/import_littlehotel.py <fichiers.csv...> > /tmp/lh.sql
puis    scripts/deploy.sh n'est pas nécessaire : passer le SQL à l'API (voir README).

Les imports suivants se font depuis l'appli équipe (Tableau de bord > Importer),
avec exactement les mêmes règles que ce script (assets/lh-import.js).
Fichiers reconnus par leurs colonnes :
  - Réservations (« Référence de réservation ») : la source principale
  - Paiements (« Passerelle de paiement »)
  - Listing clients (« Type de document ») : complète le pays et la ville manquants
  - Arrivées / départs et résumé des paiements : déjà couverts, ignorés
"""
import csv, hashlib, re, sys

MONTHS = {"jan": 1, "janv": 1, "fév": 2, "fev": 2, "févr": 2, "mar": 3, "mars": 3, "avr": 4, "mai": 5, "juin": 6,
          "juil": 7, "août": 8, "aout": 8, "sept": 9, "sep": 9, "oct": 10, "nov": 11, "déc": 12, "dec": 12}


def d_slash(v):  # 22/12/2025 [hh:mm:ss] ou 22-12-2025
    m = re.match(r"\s*(\d{2})[/-](\d{2})[/-](\d{4})", v or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


def d_french(v):  # 09 avr. 2026
    m = re.match(r"\s*(\d{1,2})\s+([^\s.]+)\.?\s+(\d{4})", v or "")
    if not m or m.group(2).lower() not in MONTHS:
        return None
    return f"{m.group(3)}-{MONTHS[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"


def num(v):
    v = (v or "").replace(" ", "").replace("\xa0", "").replace(" ", "").replace("DH", "").replace(",", ".")
    try:
        return float(v)
    except ValueError:
        return None


def clean(v):
    v = (v or "").strip()
    return None if v in ("", ".") else v.lstrip(".") or None


def lit(v):
    if v is None:
        return "null"
    if isinstance(v, (int, float)):
        return repr(round(v, 2)) if isinstance(v, float) else str(v)
    return "'" + str(v).replace("'", "''") + "'"


def read(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def reservations(rows):
    out = []
    for r in rows:
        ref = clean(r.get("Référence de réservation"))
        if not ref:
            continue
        out.append({
            "ref": ref, "booked_on": d_slash(r.get("Date de réservation")), "channel": clean(r.get("Nom du canal")),
            "first_name": clean(r.get("Prénom du client")), "last_name": clean(r.get("Nom du client")),
            "email": clean(r.get("E-mail")), "phone": clean(r.get("Numéro de téléphone du client")),
            "country": clean(r.get("Pays du client")), "city": clean(r.get("Ville du client")),
            "arrival": d_slash(r.get("Date d'arrivée")), "departure": d_slash(r.get("Date de départ")),
            "nights": int(num(r.get("Durée de séjour (en nuits)")) or 0), "eta": clean(r.get("Heure d'arrivée")),
            "comments": clean(r.get("Commentaires du client")), "notes": clean(r.get("Notes")),
            "status": clean(r.get("Statut de la réservation")), "cancelled_on": d_slash(r.get("Date d'annulation")),
            "room_types": clean(r.get("Type de chambre")), "rooms": clean(r.get("Chambre(s)")),
            "rooms_count": int(num(r.get("Nombre de chambres")) or 1),
            "adults": int(num(r.get("Nombre d'adultes")) or 0), "children": int(num(r.get("Nombre d'enfants")) or 0),
            "subtotal": num(r.get("Montant du sous-total (taxes comprises)")), "extras": num(r.get("Montant total des suppléments")),
            "tourist_tax": num(r.get("Total taxes fixes")), "total": num(r.get("Montant total")),
            "paid": num(r.get("Paiement reçu")), "due": num(r.get("Montant dû")), "invoice": clean(r.get("Numéro de facture")),
        })
    return out


def payments(rows):
    out, seen = [], {}
    for r in rows:
        ref = clean(r.get("Numéro de réservation"))
        if not ref:
            continue
        base = "|".join([r.get("Date", ""), r.get("HEURE", ""), ref, r.get("Type de transaction", ""), r.get("Type de paiement", ""),
                         r.get("Type de carte", ""), (r.get("Description") or "").strip(), r.get("Total", "")])
        seen[base] = seen.get(base, 0) + 1  # deux lignes identiques (même carte, même minute) restent deux paiements
        out.append({
            "id": hashlib.sha1(f"{base}|{seen[base]}".encode()).hexdigest()[:20], "paid_on": d_slash(r.get("Date")),
            "paid_time": clean(r.get("HEURE")), "ref": ref, "guest": clean(r.get("Nom du client")),
            "txn_type": clean(r.get("Type de transaction")), "method": clean(r.get("Type de paiement")),
            "card": clean(r.get("Type de carte")), "description": clean(r.get("Description")), "amount": num(r.get("Total")),
        })
    return out


def guest_patches(rows):
    """(nom, arrivée) -> pays, ville : pour compléter les réservations sans pays."""
    out = []
    for r in rows:
        last, arr, country = clean(r.get("Nom")), d_french(r.get("Date d'arrivée")), clean(r.get("Pays"))
        if last and arr and country:
            out.append({"last": last, "arrival": arr, "country": country, "city": clean(r.get("Ville"))})
    return out


def upsert(table, rows, key):
    if not rows:
        return ""
    cols = list(rows[0].keys())
    values = ",\n".join("(" + ",".join(lit(r[c]) for c in cols) + ")" for r in rows)
    sets = ", ".join(f"{c} = excluded.{c}" for c in cols if c != key)
    return f"insert into {table} ({', '.join(cols)}) values\n{values}\non conflict ({key}) do update set {sets}, updated_at = now();\n"


def main(paths):
    sql = ["begin;"]
    for p in paths:
        rows = read(p)
        head = rows[0].keys() if rows else []
        name = p.rsplit("/", 1)[-1]
        if "Référence de réservation" in head:
            data = reservations(rows); sql.append(upsert("lh_reservations", data, "ref")); kind = "reservations"
        elif "Passerelle de paiement" in head:
            data = payments(rows); sql.append(upsert("lh_payments", data, "id")); kind = "payments"
        elif "Type de document" in head:
            data = guest_patches(rows); kind = "guests"
            for g in data:
                sql.append(f"update lh_reservations set country = {lit(g['country'])}, city = coalesce(city, {lit(g['city'])}) "
                           f"where country is null and lower(last_name) = lower({lit(g['last'])}) and arrival = {lit(g['arrival'])};")
        else:
            print(f"-- ignoré (déjà couvert) : {name}", file=sys.stderr)
            continue
        sql.append(f"insert into lh_imports (kind, file_name, rows, imported_by) values ({lit(kind)}, {lit(name)}, {len(data)}, 'import initial');")
        print(f"-- {kind}: {len(data)} lignes ({name})", file=sys.stderr)
    sql.append("commit;")
    print("\n".join(sql))


if __name__ == "__main__":
    main(sys.argv[1:])
