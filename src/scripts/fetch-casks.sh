#!/bin/bash

FETCH_DIR="../../cache"
DATA_DIR="../../data"

mkdir -p $FETCH_DIR
mkdir -p $DATA_DIR

# Get Casks
echo "Fetching casks"
curl -s -L -o $FETCH_DIR/cask.json https://formulae.brew.sh/api/cask.json

# Get analytics
echo "Fetching analytics"
curl -s -L -o $FETCH_DIR/365d.json https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/365d.json
curl -s -L -o $FETCH_DIR/90d.json https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/90d.json
curl -s -L -o $FETCH_DIR/30d.json https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/30d.json

# Get categories
echo "Fetching categories"
curl -s -L -o $FETCH_DIR/categories.json https://github.com/alielsokary/CaskFlow/releases/latest/download/categories.json

# Get dates
echo "Fetching added_dates"
curl -s -L -o $FETCH_DIR/added_dates.json https://github.com/alielsokary/CaskFlow/releases/latest/download/added_dates.json

# Get apps.json
echo "Generating apps.json"
node generate-apps.js > $DATA_DIR/apps.json

# Get categories.json
echo "Generating categories.json"
node generate-categories.js > $DATA_DIR/categories.json
