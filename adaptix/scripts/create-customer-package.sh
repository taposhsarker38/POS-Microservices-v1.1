#!/bin/bash
# ================================================
# Create Customer Deployment Package
# ================================================
# Creates a ZIP file with all files needed for customer deployment
# NO source code included!

set -e

VERSION="${1:-v1.0.0}"
CUSTOMER="${2:-customer}"
OUTPUT_DIR="./customer-packages"
PACKAGE_NAME="adaptix-${CUSTOMER}-${VERSION}"

echo "📦 Creating deployment package for $CUSTOMER..."

# Create output directory
mkdir -p "$OUTPUT_DIR/$PACKAGE_NAME"

# Copy deployment files
cp ./deploy/docker-compose.customer.yml "$OUTPUT_DIR/$PACKAGE_NAME/docker-compose.yml"
cp ./deploy/.env.customer "$OUTPUT_DIR/$PACKAGE_NAME/.env.example"
cp ./deploy/README.md "$OUTPUT_DIR/$PACKAGE_NAME/"

# Copy Kong config (sanitized)
cp ./kong.yml "$OUTPUT_DIR/$PACKAGE_NAME/"

# Create keys directory placeholder
mkdir -p "$OUTPUT_DIR/$PACKAGE_NAME/keys"
echo "# Place your JWT keys here" > "$OUTPUT_DIR/$PACKAGE_NAME/keys/README.md"

# Create version file
cat > "$OUTPUT_DIR/$PACKAGE_NAME/VERSION" << EOF
Adaptix Business OS
Version: $VERSION
Build Date: $(date +%Y-%m-%d)
Customer: $CUSTOMER

For support: support@adaptix.io
EOF

# Create quick start script
cat > "$OUTPUT_DIR/$PACKAGE_NAME/start.sh" << 'EOF'
#!/bin/bash
# Quick start script for Adaptix

echo "🚀 Starting Adaptix..."

# Check .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Start services
docker-compose pull
docker-compose up -d

echo ""
echo "✅ Adaptix is starting..."
echo "Please wait 1-2 minutes for all services to be ready."
echo ""
echo "Check status: docker-compose ps"
echo "View logs: docker-compose logs -f"
EOF
chmod +x "$OUTPUT_DIR/$PACKAGE_NAME/start.sh"

# Create stop script
cat > "$OUTPUT_DIR/$PACKAGE_NAME/stop.sh" << 'EOF'
#!/bin/bash
echo "🛑 Stopping Adaptix..."
docker-compose down
echo "✅ Adaptix stopped."
EOF
chmod +x "$OUTPUT_DIR/$PACKAGE_NAME/stop.sh"

# Create update script
cat > "$OUTPUT_DIR/$PACKAGE_NAME/update.sh" << 'EOF'
#!/bin/bash
echo "🔄 Updating Adaptix..."
docker-compose pull
docker-compose up -d
echo "✅ Adaptix updated."
EOF
chmod +x "$OUTPUT_DIR/$PACKAGE_NAME/update.sh"

# Create ZIP
cd "$OUTPUT_DIR"
zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_NAME"
cd ..

echo ""
echo "✅ Package created: $OUTPUT_DIR/${PACKAGE_NAME}.zip"
echo ""
echo "Contents:"
ls -la "$OUTPUT_DIR/$PACKAGE_NAME"
echo ""
echo "Send this package to the customer along with:"
echo "  1. Docker registry credentials"
echo "  2. License key"
echo "  3. JWT keys (keys/ folder)"
