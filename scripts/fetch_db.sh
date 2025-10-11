#!/usr/bin/env bash
set -euo pipefail

# ---- Settings (edit if your path/branch differ) ----
REPO_OWNER="georgebastille"
REPO_NAME="halfway-app"
REF="${GIT_REF:-main}"          # optionally override via env
FILE_PATH="tfl.db"              # path in the repo
OUT_PATH="tfl.db"               # where your app expects it (change if needed)
# ----------------------------------------------------

RAW_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REF}/${FILE_PATH}"

mkdir -p "$(dirname "$OUT_PATH")"

# If it's a private repo, set GITHUB_TOKEN in Vercel → Project → Settings → Environment Variables
HDR=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  HDR=(-H "Authorization: token ${GITHUB_TOKEN}")
fi

echo "Downloading ${FILE_PATH} from ${REPO_OWNER}/${REPO_NAME}@${REF}…"
curl -fL "${HDR[@]}" "$RAW_URL" -o "$OUT_PATH"

# Quick sanity checks (optional but nice)
echo "Downloaded to ${OUT_PATH} ($(du -h "$OUT_PATH" | cut -f1))"
# Ensure it’s a real SQLite DB (not an LFS pointer)
if ! head -c 16 "$OUT_PATH" | grep -q "SQLite format 3"; then
  echo "ERROR: Downloaded file is not a SQLite DB (got a pointer/page?)." >&2
  exit 1
fi

