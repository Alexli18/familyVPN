#!/bin/bash

# Production Backup Script
# Usage: ./scripts/backup-production.sh [backup-location]

set -e

BACKUP_DIR=${1:-"/backup/vpn-server"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="vpn-backup-$TIMESTAMP"
COMPOSE_FILE="docker-compose.prod.yml"

echo "💾 Starting VPN server backup to $BACKUP_DIR/$BACKUP_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup certificates and PKI
echo "🔐 Backing up certificates and PKI..."
docker-compose -f $COMPOSE_FILE exec -T vpn-server tar czf - /app/easy-rsa /app/certificates 2>/dev/null > "$BACKUP_DIR/$BACKUP_NAME/certificates.tar.gz"

# Backup configuration files
echo "📝 Backing up configuration files..."
cp .env.production "$BACKUP_DIR/$BACKUP_NAME/"
cp docker-compose.prod.yml "$BACKUP_DIR/$BACKUP_NAME/"
cp -r src/ "$BACKUP_DIR/$BACKUP_NAME/"

# Backup logs
echo "📋 Backing up logs..."
docker-compose -f $COMPOSE_FILE logs > "$BACKUP_DIR/$BACKUP_NAME/docker-logs.txt" 2>/dev/null || true

# Create backup manifest
echo "📄 Creating backup manifest..."
cat > "$BACKUP_DIR/$BACKUP_NAME/backup-manifest.txt" << EOF
VPN Server Backup
=================
Backup Date: $(date)
Backup Name: $BACKUP_NAME
Server Host: $(hostname)
Docker Compose File: $COMPOSE_FILE

Contents:
- certificates.tar.gz: PKI certificates and Easy-RSA configuration
- .env.production: Production environment variables
- docker-compose.prod.yml: Production Docker configuration
- src/: Application source code
- docker-logs.txt: Container logs at backup time
- backup-manifest.txt: This file

Restore Instructions:
1. Extract certificates: tar xzf certificates.tar.gz
2. Copy configuration files to project directory
3. Run: docker-compose -f docker-compose.prod.yml up -d
EOF

# Create compressed archive
echo "🗜️  Creating compressed backup archive..."
cd "$BACKUP_DIR"
tar czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "vpn-backup-*.tar.gz" -mtime +7 -delete 2>/dev/null || true

echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "📊 Backup size: $(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)"

# Verify backup integrity
echo "🔍 Verifying backup integrity..."
if tar tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" > /dev/null 2>&1; then
    echo "✅ Backup integrity verified"
else
    echo "❌ Backup integrity check failed"
    exit 1
fi