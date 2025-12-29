#!/bin/bash
# script: down.sh
# description: Stop adaptix-erp system and free RAM

# Navigate to project root (adaptix folder)
cd "$(dirname "$0")/.." || exit

echo "🛑 Stopping adaptix-erp..."
docker compose -f docker-compose.single-db.yml down

echo "✅ System stopped. RAM freed."
