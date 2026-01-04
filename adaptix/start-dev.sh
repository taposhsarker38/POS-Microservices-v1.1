#!/bin/bash

# ==============================================================================
# Adaptix Development Startup Script
# ==============================================================================
# Usage: ./start-dev.sh [options] [profile/service] ...
# Options:
#   --prod           Run in "Production Mode" (No hot-reload, optimized resources)
#   --hybrid <svc>   Run system in Prod Mode, but <svc> in Dev Mode (Hot-reload)
#
# Examples:
#   ./start-dev.sh pos             (Dev Mode: Core + POS)
#   ./start-dev.sh --prod all      (Prod Mode: Run EVERYTHING efficiently)
#   ./start-dev.sh --hybrid pos    (Hybrid: Everything Prod + POS Dev)
# ==============================================================================

# Default Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

COMPOSE_FILE="docker-compose.single-db.yml"
MODE_NAME="Development (Hot-Reload)"
PROFILES="core"
HYBRID_TARGET=""

# Check arguments
if [ $# -eq 0 ]; then
    echo "ℹ️  No specific profile requested. Starting CORE services only."
    echo "   (Use './start-dev.sh pos' or './start-dev.sh --hybrid pos')"
else
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --prod)
                COMPOSE_FILE="docker-compose.prod.yml"
                MODE_NAME="Production (Optimized)"
                shift # past argument
                ;;
            --hybrid)
                COMPOSE_FILE="docker-compose.prod.yml"
                MODE_NAME="Hybrid (Prod + Dev Target)"
                HYBRID_TARGET="$2"
                PROFILES="all" # Hybrid implies running everything (or we could default to core + target, but user requested 'production background')
                # Actually, for hybrid, we usually want the whole system running in prod mode
                # so the frontend works.
                shift # past argument
                shift # past value
                ;;
            --lite)
                PROFILES="core,frontend,pos,inventory,product,accounting"
                MODE_NAME="Lite Mode (Essential Services Only)"
                shift
                ;;
            *)
                if [ "$1" == "all" ]; then
                     echo "⚠️  WARNING: 'all' profile starts 29+ services and requires significant RAM."
                     PROFILES="core,frontend,pos,inventory,product,hrms,accounting,customer,asset,promotion,payment,notification,reporting,logistics,intelligence"
                else
                     PROFILES="$PROFILES,$1"
                fi
                shift # past argument
                ;;
        esac
    done
fi

if [ "$MODE_NAME" == "Hybrid (Prod + Dev Target)" ]; then
    echo "🚀 Starting Hybrid Mode"
    echo "   1. Starting FULL system in Production Mode..."
    export COMPOSE_PROFILES="core,frontend,pos,inventory,product,hrms,accounting,customer,asset,promotion,payment,notification,reporting,logistics,intelligence"
    docker compose -f docker-compose.prod.yml up -d --remove-orphans

    echo "   2. Switching [$HYBRID_TARGET] to Development Mode (Hot-Reload)..."
    docker compose -f docker-compose.prod.yml -f docker-compose.dev-mixin.yml up -d --no-deps $HYBRID_TARGET
    
    echo "✅ Hybrid Startup Complete."
    echo "   - [$HYBRID_TARGET] is running with hot-reload."
    echo "   - Other services are running in optimized production mode."

else
    echo "🚀 Starting Adaptix in [$MODE_NAME] mode"
    echo "📂 Configuration: $COMPOSE_FILE"
    echo "📦 Profiles:      [$PROFILES]"
    echo "---------------------------------------------------"

    # Export COMPOSE_PROFILES variable so docker-compose picks it up
    export COMPOSE_PROFILES=$PROFILES

    docker compose -f $COMPOSE_FILE up -d --remove-orphans

    echo "---------------------------------------------------"
    echo "✅ Startup command sent."
    echo "   - View logs: docker compose -f $COMPOSE_FILE logs -f"
fi
