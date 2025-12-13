#!/bin/bash
# ================================================
# Adaptix Production Build Script
# ================================================
# This script builds production Docker images for distribution
# Customers receive images, NOT source code

set -e

# Configuration
REGISTRY="your-registry.azurecr.io"  # Or Docker Hub, AWS ECR, etc.
VERSION="${1:-latest}"
DATE=$(date +%Y%m%d)

echo "🏗️  Building Adaptix v$VERSION..."

# List of all services
SERVICES=(
    "auth"
    "company"
    "product"
    "pos"
    "inventory"
    "purchase"
    "hrms"
    "accounting"
    "customer"
    "asset"
    "promotion"
    "payment"
    "notification"
    "reporting"
    "ws-gateway"
)

# Build each service
for service in "${SERVICES[@]}"; do
    echo ""
    echo "📦 Building $service..."
    
    if [ -d "services/$service" ]; then
        docker build \
            --no-cache \
            --build-arg BUILD_DATE=$DATE \
            --build-arg VERSION=$VERSION \
            -t $REGISTRY/adaptix-$service:$VERSION \
            -t $REGISTRY/adaptix-$service:latest \
            ./services/$service
        
        echo "✅ $service built successfully"
    else
        echo "⚠️  Service $service not found, skipping..."
    fi
done

echo ""
echo "🎉 All images built successfully!"
echo ""
echo "To push to registry:"
echo "  docker login $REGISTRY"
echo "  ./push-images.sh $VERSION"
