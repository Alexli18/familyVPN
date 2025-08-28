# Certificate Configuration

This guide covers PKI (Public Key Infrastructure) setup and certificate management for the Family VPN Server, including certificate generation, management, and security best practices.

## Overview

Certificate management is crucial for VPN security. This guide covers setting up a Certificate Authority (CA), generating server and client certificates, and managing the certificate lifecycle.

## PKI Infrastructure Setup

### Initialize PKI

#### Automated PKI Setup
```bash
# Initialize PKI infrastructure automatically
npm run init-pki

# This creates:
# - Certificate Authority (CA)
# - Server certificates
# - Diffie-Hellman parameters
# - TLS-Auth key
```

#### Manual PKI Setup
```bash
# Navigate to Easy-RSA directory
cd easy-rsa

# Initialize PKI
./easyrsa init-pki

# Build Certificate Authority
./easyrsa build-ca nopass

# Generate server certificate
./easyrsa build-server-full server nopass

# Generate Diffie-Hellman parameters
./easyrsa gen-dh

# Generate TLS-Auth key
openvpn --genkey --secret ta.key
```

### PKI Configuration

#### Easy-RSA Configuration (vars file)
```bash
# easy-rsa/vars
set_var EASYRSA_REQ_COUNTRY    "US"
set_var EASYRSA_REQ_PROVINCE   "State"
set_var EASYRSA_REQ_CITY       "City"
set_var EASYRSA_REQ_ORG        "Family VPN"
set_var EASYRSA_REQ_EMAIL      "admin@example.com"
set_var EASYRSA_REQ_OU         "VPN Server"

# Key settings
set_var EASYRSA_KEY_SIZE       2048
set_var EASYRSA_ALGO           rsa
set_var EASYRSA_CA_EXPIRE      3650    # 10 years
set_var EASYRSA_CERT_EXPIRE    365     # 1 year
set_var EASYRSA_DIGEST         "sha256"

# Certificate extensions
set_var EASYRSA_EXT_DIR        "$EASYRSA/x509-types"
```

#### Advanced PKI Configuration
```bash
# High-security configuration
set_var EASYRSA_KEY_SIZE       4096    # Stronger keys
set_var EASYRSA_DIGEST         "sha384" # Stronger hash
set_var EASYRSA_CERT_EXPIRE    180     # Shorter certificate lifetime

# Intermediate CA setup (for large deployments)
set_var EASYRSA_INTERMEDIATE   yes
```

## Certificate Authority Management

### CA Certificate Operations

#### View CA Certificate
```bash
# Display CA certificate details
openssl x509 -in pki/ca.crt -text -noout

# Check CA certificate expiration
openssl x509 -in pki/ca.crt -enddate -noout

# Verify CA certificate
openssl x509 -in pki/ca.crt -verify -noout
```

#### CA Security
```bash
# Secure CA private key
chmod 600 pki/private/ca.key
chown root:root pki/private/ca.key

# Backup CA certificate and key
tar -czf ca-backup-$(date +%Y%m%d).tar.gz pki/ca.crt pki/private/ca.key

# Store backup securely (offline storage recommended)
```

### Certificate Revocation List (CRL)

#### Generate CRL
```bash
# Generate initial CRL
./easyrsa gen-crl

# Copy CRL to OpenVPN directory
cp pki/crl.pem /etc/openvpn/certificates/

# Configure OpenVPN to use CRL
echo "crl-verify crl.pem" >> /etc/openvpn/openvpn.conf
```

#### Update CRL
```bash
# Regenerate CRL after revoking certificates
./easyrsa gen-crl

# Restart OpenVPN to reload CRL
sudo systemctl restart openvpn@server
```

## Server Certificate Management

### Server Certificate Setup

#### Generate Server Certificate
```bash
# Generate server certificate and key
./easyrsa build-server-full server nopass

# Copy to OpenVPN directory
cp pki/issued/server.crt /etc/openvpn/certificates/
cp pki/private/server.key /etc/openvpn/certificates/

# Set proper permissions
chmod 644 /etc/openvpn/certificates/server.crt
chmod 600 /etc/openvpn/certificates/server.key
```

#### Server Certificate Configuration
```conf
# OpenVPN server certificate configuration
ca ca.crt
cert server.crt
key server.key
dh dh.pem
tls-auth ta.key 0

# Certificate verification
remote-cert-tls client
verify-client-cert require
```

### Server Certificate Renewal

#### Check Certificate Expiration
```bash
# Check server certificate expiration
openssl x509 -in certificates/server.crt -enddate -noout

# Check all certificates
for cert in certificates/*.crt; do
  echo "Certificate: $cert"
  openssl x509 -in "$cert" -enddate -noout
  echo
done
```

#### Renew Server Certificate
```bash
# Revoke old server certificate
./easyrsa revoke server

# Generate new server certificate
./easyrsa build-server-full server nopass

# Update CRL
./easyrsa gen-crl

# Copy new certificates
cp pki/issued/server.crt /etc/openvpn/certificates/
cp pki/private/server.key /etc/openvpn/certificates/
cp pki/crl.pem /etc/openvpn/certificates/

# Restart OpenVPN
sudo systemctl restart openvpn@server
```

## Client Certificate Management

### Generate Client Certificates

#### Using Web Interface
1. **Access management portal**: `http://your-server:3000`
2. **Login** with admin credentials
3. **Click "Generate New Certificate"**
4. **Enter client name** (e.g., "john-laptop")
5. **Download .ovpn file**

#### Using Command Line
```bash
# Generate client certificate interactively
npm run generate-client

# Generate with specific name
CLIENT_NAME="mary-phone" ./easyrsa build-client-full mary-phone nopass

# Bundle client configuration
npm run bundle-client mary-phone
```

#### Automated Client Generation Script
```bash
#!/bin/bash
# scripts/generate-client-cert.sh

CLIENT_NAME="$1"

if [ -z "$CLIENT_NAME" ]; then
    echo "Usage: $0 <client-name>"
    exit 1
fi

# Validate client name
if [[ ! "$CLIENT_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Error: Client name must contain only letters, numbers, hyphens, and underscores"
    exit 1
fi

# Check if certificate already exists
if [ -f "pki/issued/${CLIENT_NAME}.crt" ]; then
    echo "Error: Certificate for $CLIENT_NAME already exists"
    exit 1
fi

echo "Generating certificate for: $CLIENT_NAME"

# Generate client certificate
cd easy-rsa
./easyrsa build-client-full "$CLIENT_NAME" nopass

# Create client configuration
cat > "../certificates/${CLIENT_NAME}.ovpn" << EOF
client
dev tun
proto udp
remote YOUR_SERVER_IP 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
key-direction 1
verb 3

<ca>
$(cat pki/ca.crt)
</ca>

<cert>
$(cat pki/issued/${CLIENT_NAME}.crt)
</cert>

<key>
$(cat pki/private/${CLIENT_NAME}.key)
</key>

<tls-auth>
$(cat ta.key)
</tls-auth>
EOF

echo "Certificate generated: certificates/${CLIENT_NAME}.ovpn"
```

### Client Certificate Security

#### Certificate Validation
```bash
# Verify client certificate against CA
openssl verify -CAfile pki/ca.crt pki/issued/client-name.crt

# Check certificate details
openssl x509 -in pki/issued/client-name.crt -text -noout

# Validate certificate chain
openssl verify -verbose -CAfile pki/ca.crt pki/issued/client-name.crt
```

#### Secure Certificate Distribution
```bash
# Create password-protected archive
zip -e client-certificates.zip certificates/client-name.ovpn

# Use secure file transfer
scp certificates/client-name.ovpn user@client-machine:~/

# Or use encrypted email/secure messaging
gpg --encrypt --recipient client@email.com certificates/client-name.ovpn
```

## Certificate Revocation

### Revoke Client Certificates

#### Revoke Certificate
```bash
# Revoke client certificate
cd easy-rsa
./easyrsa revoke client-name

# Update CRL
./easyrsa gen-crl

# Copy updated CRL
cp pki/crl.pem /etc/openvpn/certificates/

# Restart OpenVPN to reload CRL
sudo systemctl restart openvpn@server
```

#### Automated Revocation Script
```bash
#!/bin/bash
# scripts/revoke-client.sh

CLIENT_NAME="$1"

if [ -z "$CLIENT_NAME" ]; then
    echo "Usage: $0 <client-name>"
    exit 1
fi

echo "Revoking certificate for: $CLIENT_NAME"

# Revoke certificate
cd easy-rsa
./easyrsa revoke "$CLIENT_NAME"

# Update CRL
./easyrsa gen-crl

# Copy CRL to OpenVPN directory
cp pki/crl.pem ../certificates/

# Remove client files
rm -f "../certificates/${CLIENT_NAME}.ovpn"
rm -f "../certificates/${CLIENT_NAME}.crt"
rm -f "../certificates/${CLIENT_NAME}.key"

# Restart OpenVPN
sudo systemctl restart openvpn@server

echo "Certificate revoked and CRL updated"
```

### Certificate Revocation List Management

#### CRL Configuration
```conf
# OpenVPN CRL configuration
crl-verify crl.pem

# Automatic CRL refresh (optional)
# crl-verify crl.pem dir
```

#### CRL Monitoring
```bash
# Check CRL contents
openssl crl -in certificates/crl.pem -text -noout

# List revoked certificates
openssl crl -in certificates/crl.pem -text -noout | grep "Serial Number"

# Check CRL expiration
openssl crl -in certificates/crl.pem -nextupdate -noout
```

## Certificate Backup and Recovery

### Backup Procedures

#### Complete PKI Backup
```bash
#!/bin/bash
# scripts/backup-certificates.sh

BACKUP_DIR="certificate-backups/backup-$(date +%Y-%m-%dT%H-%M-%S-%3NZ)"
mkdir -p "$BACKUP_DIR"

echo "Creating certificate backup in $BACKUP_DIR"

# Backup PKI directory
cp -r easy-rsa/pki "$BACKUP_DIR/"

# Backup certificates directory
cp -r certificates "$BACKUP_DIR/"

# Backup configuration
cp .env "$BACKUP_DIR/config/"
cp package.json "$BACKUP_DIR/config/"

# Create manifest
cat > "$BACKUP_DIR/manifest.json" << EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "server_hostname": "$(hostname)",
  "backup_type": "full",
  "files_included": [
    "pki/",
    "certificates/",
    "config/"
  ]
}
EOF

# Create checksums
find "$BACKUP_DIR" -type f -exec sha256sum {} \; > "$BACKUP_DIR/checksums.json"

# Compress backup
tar -czf "${BACKUP_DIR}.tar.gz" -C certificate-backups "$(basename "$BACKUP_DIR")"

echo "Backup completed: ${BACKUP_DIR}.tar.gz"
```

#### Automated Backup Schedule
```bash
# Add to crontab for daily backups
0 2 * * * /path/to/family-vpn-server/scripts/backup-certificates.sh

# Weekly full backup with cleanup
0 3 * * 0 /path/to/family-vpn-server/scripts/backup-certificates.sh && find /path/to/backups -name "*.tar.gz" -mtime +30 -delete
```

### Recovery Procedures

#### Restore from Backup
```bash
#!/bin/bash
# scripts/restore-certificates.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

echo "Restoring from backup: $BACKUP_FILE"

# Stop OpenVPN
sudo systemctl stop openvpn@server

# Create restore point
cp -r easy-rsa/pki easy-rsa/pki.backup.$(date +%Y%m%d)
cp -r certificates certificates.backup.$(date +%Y%m%d)

# Extract backup
tar -xzf "$BACKUP_FILE" -C /tmp/

# Restore files
BACKUP_DIR=$(tar -tzf "$BACKUP_FILE" | head -1 | cut -f1 -d"/")
cp -r "/tmp/$BACKUP_DIR/pki" easy-rsa/
cp -r "/tmp/$BACKUP_DIR/certificates" ./

# Verify checksums
cd "/tmp/$BACKUP_DIR"
sha256sum -c checksums.json

# Set proper permissions
chmod 600 easy-rsa/pki/private/*.key
chmod 644 easy-rsa/pki/issued/*.crt
chmod 600 certificates/*.key
chmod 644 certificates/*.crt

# Restart OpenVPN
sudo systemctl start openvpn@server

echo "Restore completed"
```

## Certificate Monitoring

### Certificate Expiration Monitoring

#### Expiration Check Script
```bash
#!/bin/bash
# scripts/check-cert-expiration.sh

WARN_DAYS=30
CRITICAL_DAYS=7

echo "Checking certificate expiration..."

check_cert() {
    local cert_file="$1"
    local cert_name="$2"
    
    if [ ! -f "$cert_file" ]; then
        echo "❌ Certificate not found: $cert_file"
        return 1
    fi
    
    local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ $days_left -lt $CRITICAL_DAYS ]; then
        echo "🚨 CRITICAL: $cert_name expires in $days_left days ($expiry_date)"
    elif [ $days_left -lt $WARN_DAYS ]; then
        echo "⚠️  WARNING: $cert_name expires in $days_left days ($expiry_date)"
    else
        echo "✅ OK: $cert_name expires in $days_left days ($expiry_date)"
    fi
}

# Check CA certificate
check_cert "easy-rsa/pki/ca.crt" "Certificate Authority"

# Check server certificate
check_cert "certificates/server.crt" "Server Certificate"

# Check client certificates
for cert in certificates/*.crt; do
    if [ -f "$cert" ] && [ "$(basename "$cert")" != "server.crt" ]; then
        client_name=$(basename "$cert" .crt)
        check_cert "$cert" "Client: $client_name"
    fi
done

# Check CRL expiration
if [ -f "certificates/crl.pem" ]; then
    crl_expiry=$(openssl crl -nextupdate -noout -in certificates/crl.pem | cut -d= -f2)
    crl_epoch=$(date -d "$crl_expiry" +%s)
    crl_days_left=$(( (crl_epoch - $(date +%s)) / 86400 ))
    
    if [ $crl_days_left -lt $WARN_DAYS ]; then
        echo "⚠️  WARNING: CRL expires in $crl_days_left days ($crl_expiry)"
    else
        echo "✅ OK: CRL expires in $crl_days_left days ($crl_expiry)"
    fi
fi
```

#### Automated Monitoring
```bash
# Add to crontab for daily monitoring
0 9 * * * /path/to/family-vpn-server/scripts/check-cert-expiration.sh | mail -s "VPN Certificate Status" admin@example.com

# Or use systemd timer
cat > /etc/systemd/system/cert-check.service << EOF
[Unit]
Description=Certificate Expiration Check
After=network.target

[Service]
Type=oneshot
ExecStart=/path/to/family-vpn-server/scripts/check-cert-expiration.sh
User=vpnuser
EOF

cat > /etc/systemd/system/cert-check.timer << EOF
[Unit]
Description=Run certificate check daily
Requires=cert-check.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl enable cert-check.timer
sudo systemctl start cert-check.timer
```

## Certificate Security Best Practices

### Key Security

#### Strong Key Generation
```bash
# Use strong random number generation
export RANDFILE=/dev/urandom

# Generate keys with strong entropy
./easyrsa build-client-full client-name nopass

# Verify key strength
openssl rsa -in pki/private/client-name.key -text -noout | grep "Private-Key"
```

#### Key Storage Security
```bash
# Secure key file permissions
find . -name "*.key" -exec chmod 600 {} \;
find . -name "*.key" -exec chown root:root {} \;

# Use encrypted storage for backups
gpg --symmetric --cipher-algo AES256 backup.tar.gz
```

### Certificate Validation

#### Certificate Chain Validation
```bash
# Validate complete certificate chain
openssl verify -CAfile easy-rsa/pki/ca.crt certificates/server.crt

# Check certificate purpose
openssl x509 -purpose -in certificates/server.crt -noout

# Verify certificate matches private key
openssl x509 -noout -modulus -in certificates/server.crt | openssl md5
openssl rsa -noout -modulus -in certificates/server.key | openssl md5
```

#### Certificate Integrity Monitoring
```bash
# Create certificate fingerprints
for cert in certificates/*.crt; do
    echo "$(basename "$cert"): $(openssl x509 -fingerprint -sha256 -noout -in "$cert")"
done > certificate-fingerprints.txt

# Monitor for changes
sha256sum certificates/*.crt > certificate-checksums.txt
```

## Troubleshooting Certificate Issues

### Common Certificate Problems

#### Certificate Verification Failures
```bash
# Check certificate validity
openssl x509 -in certificates/client.crt -text -noout

# Verify against CA
openssl verify -CAfile easy-rsa/pki/ca.crt certificates/client.crt

# Check certificate chain
openssl verify -verbose -CAfile easy-rsa/pki/ca.crt certificates/client.crt
```

#### Key Mismatch Issues
```bash
# Compare certificate and key modulus
cert_modulus=$(openssl x509 -noout -modulus -in certificates/server.crt | openssl md5)
key_modulus=$(openssl rsa -noout -modulus -in certificates/server.key | openssl md5)

if [ "$cert_modulus" = "$key_modulus" ]; then
    echo "✅ Certificate and key match"
else
    echo "❌ Certificate and key do not match"
fi
```

#### Permission Issues
```bash
# Fix certificate permissions
sudo chown -R vpnuser:vpnuser certificates/
sudo chmod 644 certificates/*.crt
sudo chmod 600 certificates/*.key
sudo chmod 644 certificates/ca.crt
sudo chmod 600 certificates/ta.key
```

### Certificate Debugging

#### Debug Certificate Loading
```bash
# Test certificate loading in OpenVPN
sudo openvpn --config /etc/openvpn/openvpn.conf --test-crypto

# Verify certificate files exist and are readable
ls -la certificates/
openssl x509 -in certificates/ca.crt -text -noout >/dev/null && echo "CA cert OK"
openssl x509 -in certificates/server.crt -text -noout >/dev/null && echo "Server cert OK"
openssl rsa -in certificates/server.key -check -noout && echo "Server key OK"
```

## Next Steps

After configuring certificates:

1. **[Security Hardening](security.md#certificate-security)** - Additional certificate security
2. **[Client Setup](../troubleshooting/common-issues.md#certificate-issues)** - Help clients install certificates
3. **[Monitoring Setup](../troubleshooting/diagnostics.md)** - Monitor certificate health