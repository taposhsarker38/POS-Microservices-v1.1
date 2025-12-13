#!/bin/bash
# ================================================
# Push Production Images to Registry
# ================================================

set -e

# Configuration - Update these values!
REGISTRY="${DOCKER_REGISTRY:-docker.io/yourusername}"  # or your-registry.azurecr.io
VERSION="${1:-v1.0.0}"

echo "📤 Pushing Adaptix v$VERSION to $REGISTRY..."

# Login check
echo "Checking Docker login..."
docker info | grep -q "Username" || {
    echo "⚠️  Not logged in. Please run: docker login $REGISTRY"
    exit 1
}

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
)

# Push each service
for service in "${SERVICES[@]}"; do
    echo ""
    echo "📤 Pushing adaptix-$service..."
    
    # Tag for registry
    docker tag adaptix_$service:latest $REGISTRY/adaptix-$service:$VERSION
    docker tag adaptix_$service:latest $REGISTRY/adaptix-$service:latest
    
    # Push
    docker push $REGISTRY/adaptix-$service:$VERSION
    docker push $REGISTRY/adaptix-$service:latest
    
    echo "✅ adaptix-$service pushed"
done

echo ""
echo "🎉 All images pushed to $REGISTRY!"
echo ""
echo "Customers can now pull using:"
echo "  docker pull $REGISTRY/adaptix-auth:$VERSION"
