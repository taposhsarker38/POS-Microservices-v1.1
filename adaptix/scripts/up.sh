#!/bin/bash
# script: up.sh
# description: Start adaptix-erp system in optimized mode

# Unset conflicting variables
unset ADAPTIX_DEV_MODE

# Navigate to project root (adaptix folder)
cd "$(dirname "$0")/.." || exit

echo "🚀 Starting adaptix-erp in optimized mode..."
docker compose -f docker-compose.single-db.yml up -d

echo "✅ System started!"
echo "👉 Use './scripts/logs.sh' to check status"
