# Backup and Recovery Procedures

This guide covers backup creation, restoration, and disaster recovery procedures.

## Backup Procedures

### Automated Backup

The system includes automated backup functionality for certificates and configuration.

```bash
# Create full backup
npm run backup:create

# List available backups
npm run backup:list

# Verify backup integrity
npm run backup:verify
```

### Manual Backup

#### Certificate Backup

```bash
# Backup PKI infrastructure
cp -r easy-rsa/pki/ backup-pki-$(date +%Y%m%d)/

# Backup client certificates
cp -r test-certificates/ backup-certs-$(date +%Y%m%d)/
cp -r certificates/ backup-server-certs-$(date +%Y%m%d)/

# Create compressed archive
tar -czf pki-backup-$(date +%Y%m%d).tar.gz backup-pki-* backup-certs-* backup-server-certs-*
```

#### Configuration Backup

```bash
# Backup environment configuration
cp .env backup-env-$(date +%Y%m%d)

# Backup application logs
cp -r logs/ backup-logs-$(date +%Y%m%d)/

# Backup scripts and custom configurations
cp -r scripts/ backup-scripts-$(date +%Y%m%d)/
```

#### Complete System Backup

```bash
#!/bin/bash
# Complete backup script

BACKUP_DIR="vpn-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

# Copy essential files
cp .env $BACKUP_DIR/
cp -r easy-rsa/pki/ $BACKUP_DIR/pki/
cp -r certificates/ $BACKUP_DIR/certificates/
cp -r test-certificates/ $BACKUP_DIR/test-certificates/
cp -r logs/ $BACKUP_DIR/logs/
cp package.json $BACKUP_DIR/
cp package-lock.json $BACKUP_DIR/

# Create manifest
echo "Backup created: $(date)" > $BACKUP_DIR/manifest.txt
echo "System: $(uname -a)" >> $BACKUP_DIR/manifest.txt
echo "Node.js: $(node --version)" >> $BACKUP_DIR/manifest.txt
echo "NPM: $(npm --version)" >> $BACKUP_DIR/manifest.txt

# Create checksums
find $BACKUP_DIR -type f -exec md5sum {} \; > $BACKUP_DIR/checksums.md5

# Compress backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR/
rm -rf $BACKUP_DIR/

echo "Backup created: $BACKUP_DIR.tar.gz"
```

## Recovery Procedures

### Certificate Recovery

#### Restore PKI Infrastructure

```bash
# Stop services first
npm run docker:down
pkill -f "node.*server.js"

# Backup current state (if any)
mv easy-rsa/pki/ easy-rsa/pki-backup-$(date +%Y%m%d) 2>/dev/null

# Restore from backup
tar -xzf pki-backup-YYYYMMDD.tar.gz
cp -r backup-pki-YYYYMMDD/ easy-rsa/pki/

# Set correct permissions
chmod -R 755 easy-rsa/pki/
chmod 600 easy-rsa/pki/private/*
chown -R $USER:$USER easy-rsa/pki/

# Verify restoration
ls -la easy-rsa/pki/
openssl x509 -in easy-rsa/pki/ca.crt -text -noout | grep -A2 "Validity"
```

#### Restore Client Certificates

```bash
# Restore client certificate directory
rm -rf test-certificates/
cp -r backup-certs-YYYYMMDD/ test-certificates/

# Restore server certificates
rm -rf certificates/
cp -r backup-server-certs-YYYYMMDD/ certificates/

# Set permissions
chmod 755 test-certificates/ certificates/
chmod 644 test-certificates/*.crt test-certificates/*.ovpn
chmod 600 test-certificates/*.key
```

### Configuration Recovery

#### Restore Environment Configuration

```bash
# Backup current configuration
cp .env .env.backup-$(date +%Y%m%d) 2>/dev/null

# Restore from backup
cp backup-env-YYYYMMDD .env

# Verify configuration
cat .env | grep -E "(VPN_HOST|VPN_SUBNET|JWT_SECRET)"

# Test configuration
npm run validate-config
```

#### Restore Application State

```bash
# Restore logs (optional)
rm -rf logs/
cp -r backup-logs-YYYYMMDD/ logs/

# Restore custom scripts
cp -r backup-scripts-YYYYMMDD/* scripts/

# Reinstall dependencies
npm install

# Verify installation
npm test
```

### Complete System Recovery

#### Full System Restoration

```bash
#!/bin/bash
# Complete system recovery script

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

echo "🔄 Starting system recovery from $BACKUP_FILE"

# Stop all services
echo "Stopping services..."
npm run docker:down 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null
sleep 5

# Create recovery backup of current state
echo "Creating recovery backup..."
RECOVERY_BACKUP="recovery-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $RECOVERY_BACKUP
cp .env $RECOVERY_BACKUP/ 2>/dev/null
cp -r easy-rsa/pki/ $RECOVERY_BACKUP/pki/ 2>/dev/null
cp -r certificates/ $RECOVERY_BACKUP/certificates/ 2>/dev/null

# Extract backup
echo "Extracting backup..."
tar -xzf $BACKUP_FILE

# Determine backup directory name
BACKUP_DIR=$(tar -tzf $BACKUP_FILE | head -1 | cut -f1 -d"/")

# Restore files
echo "Restoring configuration..."
cp $BACKUP_DIR/.env .env

echo "Restoring PKI..."
rm -rf easy-rsa/pki/
cp -r $BACKUP_DIR/pki/ easy-rsa/pki/

echo "Restoring certificates..."
rm -rf certificates/ test-certificates/
cp -r $BACKUP_DIR/certificates/ certificates/
cp -r $BACKUP_DIR/test-certificates/ test-certificates/

echo "Restoring logs..."
rm -rf logs/
cp -r $BACKUP_DIR/logs/ logs/

# Set permissions
echo "Setting permissions..."
chmod -R 755 easy-rsa/pki/
chmod 600 easy-rsa/pki/private/*
chmod 755 certificates/ test-certificates/
chmod 644 certificates/*.crt test-certificates/*.crt
chmod 600 certificates/*.key test-certificates/*.key
chown -R $USER:$USER easy-rsa/ certificates/ test-certificates/

# Verify checksums if available
if [ -f "$BACKUP_DIR/checksums.md5" ]; then
    echo "Verifying checksums..."
    cd $BACKUP_DIR
    md5sum -c checksums.md5
    cd ..
fi

# Clean up extracted backup
rm -rf $BACKUP_DIR/

# Reinstall dependencies
echo "Reinstalling dependencies..."
npm install

# Test restoration
echo "Testing restoration..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ System recovery completed successfully"
    echo "Recovery backup saved in: $RECOVERY_BACKUP"
    
    # Start services
    echo "Starting services..."
    npm start &
    
    echo "🎉 System is ready!"
else
    echo "❌ System recovery failed"
    echo "Check logs and consider manual recovery"
    echo "Recovery backup available in: $RECOVERY_BACKUP"
    exit 1
fi
```

## Disaster Recovery Scenarios

### Scenario 1: Complete PKI Loss

When the entire PKI infrastructure is lost or corrupted:

```bash
# CRITICAL: This will invalidate ALL existing client certificates!

echo "⚠️  WARNING: This will invalidate all existing certificates!"
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    exit 1
fi

# Stop all services
npm run docker:down
pkill -f "node.*server.js"

# Backup corrupted PKI for forensics
mv easy-rsa/pki/ easy-rsa/pki-corrupted-$(date +%Y%m%d)

# Initialize new PKI
npm run clean
npm run init-pki

# Regenerate server certificate
npm run fix-server-cert

# Update server configuration
npm run harden-config

# Notify all users about certificate renewal
echo "📧 IMPORTANT: All client certificates must be regenerated!"
echo "Previous certificates are no longer valid."

# Generate new client certificates for known users
# (Extract user list from logs or backup)
grep "CLIENT_CERTIFICATE_GENERATED" logs/security-*.log | \
    awk '{print $NF}' | sort -u > client-list.txt

echo "Client list saved to client-list.txt"
echo "Regenerate certificates for each client manually"
```

### Scenario 2: Security Breach

When a security breach is detected:

```bash
# IMMEDIATE RESPONSE PROTOCOL

echo "🚨 SECURITY BREACH DETECTED - INITIATING LOCKDOWN"

# 1. Immediately stop all services
npm run docker:down
pkill -f "node.*server.js"
sudo systemctl stop openvpn@server 2>/dev/null

# 2. Create forensic backup
FORENSIC_BACKUP="forensic-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . ../$FORENSIC_BACKUP/
echo "Forensic backup created: ../$FORENSIC_BACKUP"

# 3. Check for signs of compromise
echo "Checking for compromise indicators..."
grep -i -E "(failed|breach|attack|intrusion|unauthorized)" logs/security-*.log > security-incidents.log
grep -i -E "(authentication.*failed)" logs/application-*.log >> security-incidents.log

# 4. Revoke all certificates immediately
echo "Revoking all active certificates..."
# Add all issued certificates to CRL
for cert in easy-rsa/pki/issued/*.crt; do
    if [ "$cert" != "easy-rsa/pki/issued/server.crt" ]; then
        basename=$(basename "$cert" .crt)
        echo "Revoking: $basename"
        cd easy-rsa && ./easyrsa revoke "$basename" && cd ..
    fi
done

# Generate new CRL
cd easy-rsa && ./easyrsa gen-crl && cd ..

# 5. Change all secrets
echo "Changing all authentication secrets..."
rm .env
npm run setup-auth
npm run setup-secrets

# 6. Reinitialize PKI with new CA
echo "Reinitializing PKI infrastructure..."
npm run clean
npm run init-pki

# 7. Update security configuration
npm run harden-config
npm run security-scan

# 8. Create incident report
cat > security-incident-$(date +%Y%m%d-%H%M%S).txt << EOF
SECURITY INCIDENT REPORT
========================
Date: $(date)
System: $(uname -a)

ACTIONS TAKEN:
- All services stopped immediately
- Forensic backup created: $FORENSIC_BACKUP
- All certificates revoked
- Authentication secrets changed
- PKI infrastructure reinitialized
- Security configuration updated

EVIDENCE:
$(cat security-incidents.log)

NEXT STEPS:
1. Analyze forensic backup for attack vectors
2. Review system logs for timeline of compromise
3. Update security measures based on findings
4. Regenerate all client certificates
5. Notify all users of security incident
EOF

echo "✅ Immediate response completed"
echo "📋 Incident report: security-incident-$(date +%Y%m%d-%H%M%S).txt"
echo "🔍 Review forensic backup: ../$FORENSIC_BACKUP"
```

### Scenario 3: System Access Loss

When administrative access to the system is lost:

```bash
# EMERGENCY ACCESS RECOVERY

# If you have physical/console access:

# 1. Reset web authentication
rm .env
npm run setup-auth

# 2. Check network configuration
npm run firewall:status
netstat -tlnp | grep 3000

# 3. Reset to default configuration
cp .env.example .env
npm run setup

# 4. Check service status
npm test
npm start

# If you have backup access via SSH key:

# 1. Connect via SSH
ssh -i ~/.ssh/emergency_key user@vpn-server

# 2. Navigate to VPN directory
cd /path/to/vpn/server

# 3. Follow standard recovery procedures
npm run backup:create  # Create current state backup
# Then proceed with configuration reset
```

## Monitoring and Prevention

### Automated Backup Schedule

```bash
# Add to crontab (crontab -e)

# Daily backup at 2 AM
0 2 * * * cd /path/to/vpn && npm run backup:create

# Weekly full backup at 3 AM on Sundays
0 3 * * 0 cd /path/to/vpn && ./full-backup.sh

# Monthly cleanup of old backups (keep last 12)
0 4 1 * * find /path/to/vpn/certificate-backups/ -type d -mtime +360 -exec rm -rf {} \;
```

### Health Monitoring

```bash
# Add to crontab for daily health checks

# Daily health check at 6 AM
0 6 * * * cd /path/to/vpn && npm test > /tmp/vpn-health-$(date +\%Y\%m\%d).log 2>&1

# Certificate expiration check (weekly)
0 7 * * 1 cd /path/to/vpn && openssl x509 -in easy-rsa/pki/ca.crt -checkend 2592000 -noout || echo "CA certificate expires within 30 days" | mail -s "VPN Certificate Warning" admin@example.com
```

### Backup Verification

```bash
#!/bin/bash
# Backup verification script

BACKUP_DIR="certificate-backups"

echo "🔍 Verifying backup integrity..."

for backup in $BACKUP_DIR/backup-*/; do
    if [ -d "$backup" ]; then
        echo "Checking: $backup"
        
        # Check manifest
        if [ -f "$backup/manifest.json" ]; then
            echo "  ✅ Manifest exists"
        else
            echo "  ❌ Manifest missing"
        fi
        
        # Check checksums
        if [ -f "$backup/checksums.json" ]; then
            echo "  ✅ Checksums exist"
            # Verify checksums here if needed
        else
            echo "  ❌ Checksums missing"
        fi
        
        # Check essential files
        if [ -f "$backup/pki/ca.crt" ]; then
            echo "  ✅ CA certificate present"
        else
            echo "  ❌ CA certificate missing"
        fi
    fi
done

echo "Backup verification completed"
```

## Recovery Testing

### Regular Recovery Drills

```bash
#!/bin/bash
# Recovery drill script - run monthly

echo "🧪 Starting recovery drill..."

# Create test environment
TEST_DIR="recovery-test-$(date +%Y%m%d)"
mkdir -p $TEST_DIR
cd $TEST_DIR

# Copy application files (not data)
cp -r ../src .
cp -r ../scripts .
cp ../package.json .
cp ../package-lock.json .

# Install dependencies
npm install

# Test backup restoration
LATEST_BACKUP=$(ls -t ../certificate-backups/backup-*.tar.gz | head -1)
echo "Testing restoration of: $LATEST_BACKUP"

# Extract and restore
tar -xzf $LATEST_BACKUP
# ... restoration steps ...

# Test functionality
npm test

if [ $? -eq 0 ]; then
    echo "✅ Recovery drill successful"
else
    echo "❌ Recovery drill failed"
fi

# Cleanup
cd ..
rm -rf $TEST_DIR

echo "Recovery drill completed"
```

Remember: Regular testing of backup and recovery procedures is essential. Schedule monthly recovery drills to ensure your procedures work when needed.