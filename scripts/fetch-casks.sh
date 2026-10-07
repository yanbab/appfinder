#!/bin/bash
#
# Fetch Casks
#
# Fetches latest Homebrew casks, analytics, and metadata into ~/.cache/appfinder,
# then runs generators to update apps.json and categories.json.

CACHE_DIR="${HOME}/.cache/appfinder"
FETCH_DIR="${CACHE_DIR}/fetch"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$FETCH_DIR"
mkdir -p "$CACHE_DIR"

# Get Casks
echo "==> Updating Homebrew casks..."
curl -s -L -o "$FETCH_DIR/cask.json" https://formulae.brew.sh/api/cask.json

# Get analytics
echo "==> Updating analytics (30d)..."
curl -s -L -o "$FETCH_DIR/30d.json" https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/30d.json
echo "==> Updating analytics (90d)..."
curl -s -L -o "$FETCH_DIR/90d.json" https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/90d.json
echo "==> Updating analytics (365d)..."
curl -s -L -o "$FETCH_DIR/365d.json" https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/365d.json

# Get categories
echo "==> Updating categories..."
curl -s -L -o "$FETCH_DIR/categories.json" https://github.com/alielsokary/CaskFlow/releases/latest/download/categories.json

# Get dates
echo "==> Updating recent applications..."
curl -s -L -o "$FETCH_DIR/added_dates.json" https://github.com/alielsokary/CaskFlow/releases/latest/download/added_dates.json

# Get apps.json
echo "==> Caching apps..."
node "$SCRIPT_DIR/generate-apps.js" "$FETCH_DIR" > "$CACHE_DIR/apps.json"

# Get categories.json
echo "==> Caching categories..."
node "$SCRIPT_DIR/generate-categories.js" > "$CACHE_DIR/categories.json"

echo "==> ✔︎ Updated"
sleep 1