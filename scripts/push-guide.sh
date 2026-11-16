#!/usr/bin/env bash
# Publie le dossier guide/ seul dans le dépôt Lamoun-guide (Netlify le déploie automatiquement).
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE="${GUIDE_REMOTE:-https://github.com/superlunette75-jpg/Lamoun-guide.git}"
SPLIT=$(git subtree split --prefix=guide main 2>/dev/null | tail -1 | grep -oE "[0-9a-f]{40}")
git push --force "$REMOTE" "${SPLIT}:refs/heads/main"
echo "guide/ publié sur $REMOTE (main)"
