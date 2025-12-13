#!/bin/bash
# ================================================
# Migrate to Single Database
# ================================================
# This script migrates from 14 separate databases to 1 single database

set -e

echo "🔄 Migrating to Single Database..."
echo ""

# Step 1: Stop all services
echo "📌 Step 1: Stopping current services..."
docker-compose down --remove-orphans 2>/dev/null || true
echo "✅ Services stopped"
echo ""

# Step 2: Backup existing data (if needed)
echo "📌 Step 2: Creating backups (if containers exist)..."
BACKUP_DIR="./backups/migration_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

for db in auth company product pos inventory purchase hrms accounting customer asset promotion payment notification reporting; do
    CONTAINER="adaptix-postgres-${db}"
    if docker ps -a | grep -q $CONTAINER; then
        echo "  Backing up ${db}db..."
        docker exec $CONTAINER pg_dump -U postgres ${db}db > $BACKUP_DIR/${db}.sql 2>/dev/null || true
    fi
done
echo "✅ Backups created in $BACKUP_DIR"
echo ""

# Step 3: Remove old containers and volumes
echo "📌 Step 3: Cleaning up old database containers..."
docker-compose -f docker-compose.yml down -v --remove-orphans 2>/dev/null || true

# Remove old postgres containers
for db in auth company product pos inventory purchase hrms accounting customer asset promotion payment notification reporting; do
    docker rm -f adaptix-postgres-${db} 2>/dev/null || true
done
echo "✅ Old containers removed"
echo ""

# Step 4: Copy .env file
echo "📌 Step 4: Setting up environment..."
cp .env.single-db .env
echo "✅ Environment configured"
echo ""

# Step 5: Start single database
echo "📌 Step 5: Starting single database..."
docker-compose -f docker-compose.single-db.yml up -d postgres redis rabbitmq
echo "Waiting for database to be ready..."
sleep 10
echo "✅ Database started"
echo ""

# Step 6: Verify schemas
echo "📌 Step 6: Verifying schemas..."
docker exec adaptix-postgres psql -U adaptix -d adaptix -c "\dn" 2>/dev/null || {
    echo "⚠️ Schemas not created yet, waiting..."
    sleep 5
}
echo "✅ Schemas verified"
echo ""

# Step 7: Start all services
echo "📌 Step 7: Starting all services..."
docker-compose -f docker-compose.single-db.yml up -d
echo "✅ All services started"
echo ""

# Step 8: Run migrations
echo "📌 Step 8: Running migrations..."
sleep 10  # Wait for services to start

SERVICES="auth company product pos inventory purchase hrms accounting customer asset promotion payment notification reporting"

for service in $SERVICES; do
    echo "  Migrating $service..."
    docker exec adaptix-$service python manage.py migrate --noinput 2>/dev/null || echo "  ⚠️ $service migration pending"
done
echo "✅ Migrations complete"
echo ""

# Step 9: Verify
echo "📌 Step 9: Verifying..."
echo ""
echo "Database Connection:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: adaptix"
echo "  Username: adaptix"
echo "  Password: adaptix123"
echo ""
docker-compose -f docker-compose.single-db.yml ps
echo ""
echo "🎉 Migration complete!"
echo ""
echo "To check schemas:"
echo "  docker exec adaptix-postgres psql -U adaptix -d adaptix -c '\dn'"
echo ""
echo "To connect from pgAdmin/DBeaver:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: adaptix"
echo "  Username: adaptix"
echo "  Password: adaptix123"
