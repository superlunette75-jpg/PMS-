#!/usr/bin/env bash
# Déploiement sans CLI, via l'API de gestion Supabase (curl seulement).
#   SUPABASE_ACCESS_TOKEN=sbp_xxx scripts/deploy.sh sql        # applique migrations + seed
#   SUPABASE_ACCESS_TOKEN=sbp_xxx scripts/deploy.sh functions  # déploie toutes les fonctions
#   SUPABASE_ACCESS_TOKEN=sbp_xxx scripts/deploy.sh secrets NAME=value [NAME=value...]
#   SUPABASE_ACCESS_TOKEN=sbp_xxx scripts/deploy.sh cron CRON_SECRET  # planifie les rappels (pg_cron + pg_net)
set -euo pipefail
REF="${SUPABASE_PROJECT_REF:-xysskjvpotmpekmtgzhp}"
API="https://api.supabase.com/v1/projects/$REF"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN manquant (tableau de bord > Account > Access Tokens)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUTH=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")

sql_file() {  # exécute un fichier SQL
  python3 -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1], encoding="utf-8").read()}))' "$1" > /tmp/lamoun-q.json
  curl -sS -X POST "$API/database/query" "${AUTH[@]}" -H "Content-Type: application/json" --data @/tmp/lamoun-q.json; echo
}

case "${1:-}" in
  sql)
    echo "== migration"; sql_file "$ROOT/supabase/migrations/0001_schema.sql"
    echo "== seed"; sql_file "$ROOT/supabase/seed.sql" ;;
  functions)
    cd "$ROOT"
    for fn in checkin order availability telegram remind ical status account; do
      echo "== $fn"
      args=(-F "metadata={\"name\":\"$fn\",\"entrypoint_path\":\"supabase/functions/$fn/index.ts\",\"verify_jwt\":false};type=application/json")
      for f in supabase/functions/$fn/index.ts supabase/functions/_shared/*.ts; do args+=(-F "file=@$f;filename=$f"); done
      curl -sS -X POST "$API/functions/deploy?slug=$fn" "${AUTH[@]}" "${args[@]}" | python3 -c 'import json,sys; j=json.load(sys.stdin); print(j.get("slug") or j)'
    done ;;
  secrets)
    shift; python3 -c 'import json,sys; print(json.dumps([{"name": a.split("=",1)[0], "value": a.split("=",1)[1]} for a in sys.argv[1:]]))' "$@" > /tmp/lamoun-s.json
    curl -sS -X POST "$API/secrets" "${AUTH[@]}" -H "Content-Type: application/json" --data @/tmp/lamoun-s.json; echo ;;
  cron)
    SECRET="${2:?CRON_SECRET}"
    cat > /tmp/lamoun-cron.sql <<EOF
create extension if not exists pg_cron; create extension if not exists pg_net;
select cron.unschedule('lamoun-remind') where exists (select 1 from cron.job where jobname = 'lamoun-remind');
select cron.schedule('lamoun-remind', '*/15 * * * *', \$\$
  select net.http_post(url := 'https://$REF.supabase.co/functions/v1/remind',
    headers := '{"Content-Type":"application/json","x-cron-secret":"$SECRET"}'::jsonb, body := '{}'::jsonb);
\$\$);
EOF
    sql_file /tmp/lamoun-cron.sql ;;
  *) echo "usage: deploy.sh sql | functions | secrets NAME=value... | cron CRON_SECRET"; exit 1 ;;
esac
