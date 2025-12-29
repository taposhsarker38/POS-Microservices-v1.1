#!/bin/bash
# script: logs.sh
# description: View logs with intelligent filtering

# Navigate to project root (adaptix folder)
cd "$(dirname "$0")/.." || exit

if [ -z "$1" ]; then
    echo "📜 Showing all logs (excluding health checks)..."
    docker compose -f docker-compose.single-db.yml logs -f --tail 50 | grep -v "GET /health/" | grep -v "GET /metrics"
else
    echo "📜 Showing logs for $1..."
    docker compose -f docker-compose.single-db.yml logs -f --tail 50 "$1"
fi
