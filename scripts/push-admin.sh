#!/usr/bin/env bash
# Publie le dossier admin/ seul dans le dépôt Lamoun-ekip (Netlify le déploie automatiquement).
# Usage : scripts/push-admin.sh   (après un commit sur main)
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE="${ADMIN_REMOTE:-https://github.com/superlunette75-jpg/Lamoun-ekip.git}"
SPLIT=$(git subtree split --prefix=admin main)
git push --force "$REMOTE" "$SPLIT:refs/heads/main"
echo "admin/ publié sur $REMOTE (main)"
