#!/bin/bash
# script: build_all.sh
# description: Build all services sequentially to avoid OOM

# Navigate to project root
cd "$(dirname "$0")/.." || exit

# Correct service names from docker-compose.single-db.yml
services=(
    "accounting" 
    "asset" 
    "company" 
    "customer" 
    "hrms-service" 
    "inventory" 
    "logistics-service" 
    "manufacturing" 
    "notification" 
    "payment" 
    "pos" 
    "product" 
    "promotion" 
    "purchase" 
    "quality-service" 
    "reporting" 
    "ai-service"
)

echo "🚀 Starting Sequential Build..."

for service in "${services[@]}"; do
    echo "🔨 Building $service..."
    docker compose -f docker-compose.single-db.yml build "$service"
    if [ $? -ne 0 ]; then
        echo "❌ Build failed for $service"
        exit 1
    fi
    echo "✅ Built $service"
done

echo "🎉 All services built successfully!"
