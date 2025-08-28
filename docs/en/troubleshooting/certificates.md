# Certificate Troubleshooting

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [Troubleshooting](README.md) > Certificates

🌐 **Language**: [English](../../en/troubleshooting/certificates.md) | [Русский](../../ru/troubleshooting/certificates.md)

This guide helps resolve certificate-related issues with the Family VPN Server.

## Common Certificate Issues

### Certificate Authority (CA) Problems

#### CA Certificate Missing or Corrupted

**Symptoms:**
- "CA certificate not found" errors
- Cannot generate client certificates
- Certificate verification failures

**Solutions:**

1. **Check CA Certificate**
   ```bash
   # Verify CA certificate exists
   ls -la easy-rsa/pki/ca.crt
   
   # Check CA certificate validity
   openssl x509 -in easy-rsa/pki/ca.crt -text -noout
   
   # Verify CA certificate
   openssl x509 -in easy-rsa/pki/ca.crt -verify -noout
   ```

2. **Regenerate CA if Corrupted**
   ```bash
   # Backup existing PKI
   cp -r easy-rsa/pki easy-rsa/pki.backup.$(date +%Y%m%d)
   
   # Initialize new PKI
   cd easy-rsa
   ./easyrsa init-pki
   
   # Generate new CA
   ./easyrsa build-ca nopass
   ```

#### CA Private Key Issues

**Symptoms:**
- Cannot sign certificates
- "CA private key not found" errors
- Permission denied errors

**Solutions:**

1. **Check CA Key Permissions**
   ```bash
   # Verify CA key exists and has correct permissions
   ls -la easy-rsa/pki/private/ca.key
   
   # Fix permissions if needed
   chmod 600 easy-rsa/pki/private/ca.key
   chown $USER:$USER easy-rsa/pki/private/ca.key
   ```

2. **Verify CA Key Integrity**
   ```bash
   # Test CA private key
   openssl rsa -in easy-rsa/pki/private/ca.key -check -noout
   
   # Verify CA key matches certificate
   openssl x509 -noout -modulus -in easy-rsa/pki/ca.crt | openssl md5
   openssl rsa -noout -modulus -in easy-rsa/pki/private/ca.key | openssl md5
   ```

### Server Certificate Problems

#### Server Certificate Expired

**Symptoms:**
- VPN clients cannot connect
- "Certificate has expired" errors
- TLS handshake failures

**Solutions:**

1. **Check Server Certificate Expiration**
   ```bash
   # Check expiration date
   openssl x509 -in certificates/server.crt -enddate -noout
   
   # Check all certificates
   for cert in certificates/*.crt; do
     echo "Certificate: $cert"
     openssl x509 -in "$cert" -enddate -noout
   done
   ```

2. **Renew Server Certificate**
   ```bash
   # Revoke old certificate
   cd easy-rsa
   ./easyrsa revoke server
   
   # Generate new server certificate
   ./easyrsa build-server-full server nopass
   
   # Update CRL
   ./easyrsa gen-crl
   
   # Copy new certificates
   cp pki/issued/server.crt ../certificates/
   cp pki/private/server.key ../certificates/
   cp pki/crl.pem ../certificates/
   ```

#### Server Certificate/Key Mismatch

**Symptoms:**
- OpenVPN fails to start
- "Certificate and private key do not match" errors

**Solutions:**

1. **Verify Certificate and Key Match**
   ```bash
   # Compare certificate and key modulus
   cert_modulus=$(openssl x509 -noout -modulus -in certificates/server.crt | openssl md5)
   key_modulus=$(openssl rsa -noout -modulus -in certificates/server.key | openssl md5)
   
   echo "Certificate modulus: $cert_modulus"
   echo "Key modulus: $key_modulus"
   
   if [ "$cert_modulus" = "$key_modulus" ]; then
     echo "✅ Certificate and key match"
   else
     echo "❌ Certificate and key do not match"
   fi
   ```

2. **Regenerate Matching Certificate and Key**
   ```bash
   # Generate new server certificate
   cd easy-rsa
   ./easyrsa build-server-full server nopass
   
   # Copy to certificates directory
   cp pki/issued/server.crt ../certificates/
   cp pki/private/server.key ../certificates/
   ```

### Client Certificate Issues

#### Client Certificate Generation Failures

**Symptoms:**
- "Failed to generate client certificate" errors
- Empty or corrupted .ovpn files
- Certificate generation scripts fail

**Solutions:**

1. **Check Easy-RSA Configuration**
   ```bash
   # Verify Easy-RSA is properly configured
   cd easy-rsa
   ls -la pki/
   
   # Check vars file
   cat vars 2>/dev/null || echo "No vars file found"
   
   # Test Easy-RSA functionality
   ./easyrsa show-ca
   ```

2. **Generate Client Certificate Manually**
   ```bash
   # Navigate to Easy-RSA directory
   cd easy-rsa
   
   # Generate client certificate
   ./easyrsa build-client-full client-name nopass
   
   # Verify certificate was created
   ls -la pki/issued/client-name.crt
   ls -la pki/private/client-name.key
   ```

3. **Create Client Configuration**
   ```bash
   # Use the bundle script
   npm run bundle-client client-name
   
   # Or create manually
   cat > certificates/client-name.ovpn << EOF
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
   $(cat easy-rsa/pki/ca.crt)
   </ca>
   
   <cert>
   $(cat easy-rsa/pki/issued/client-name.crt)
   </cert>
   
   <key>
   $(cat easy-rsa/pki/private/client-name.key)
   </key>
   
   <tls-auth>
   $(cat certificates/ta.key)
   </tls-auth>
   EOF
   ```

#### Client Certificate Revocation Issues

**Symptoms:**
- Revoked clients can still connect
- CRL not updating
- Certificate revocation list errors

**Solutions:**

1. **Check CRL Configuration**
   ```bash
   # Verify CRL exists
   ls -la certificates/crl.pem
   
   # Check CRL contents
   openssl crl -in certificates/crl.pem -text -noout
   
   # Verify OpenVPN is using CRL
   grep "crl-verify" /etc/openvpn/openvpn.conf
   ```

2. **Update Certificate Revocation List**
   ```bash
   # Regenerate CRL
   cd easy-rsa
   ./easyrsa gen-crl
   
   # Copy to OpenVPN directory
   cp pki/crl.pem ../certificates/
   
   # Restart OpenVPN to reload CRL
   sudo systemctl restart openvpn@server
   ```

3. **Revoke Certificate Properly**
   ```bash
   # Revoke client certificate
   cd easy-rsa
   ./easyrsa revoke client-name
   
   # Update CRL
   ./easyrsa gen-crl
   cp pki/crl.pem ../certificates/
   
   # Remove client files
   rm -f ../certificates/client-name.*
   
   # Restart OpenVPN
   sudo systemctl restart openvpn@server
   ```

### Certificate Validation Errors

#### Certificate Chain Validation Failures

**Symptoms:**
- "Certificate chain verification failed"
- Client connection rejected
- TLS handshake errors

**Solutions:**

1. **Verify Certificate Chain**
   ```bash
   # Check complete certificate chain
   openssl verify -verbose -CAfile certificates/ca.crt certificates/server.crt
   openssl verify -verbose -CAfile certificates/ca.crt certificates/client-name.crt
   
   # Check certificate purpose
   openssl x509 -purpose -in certificates/server.crt -noout
   openssl x509 -purpose -in certificates/client-name.crt -noout
   ```

2. **Rebuild Certificate Chain**
   ```bash
   # If chain is broken, regenerate all certificates
   cd easy-rsa
   
   # Backup current PKI
   cp -r pki pki.backup.$(date +%Y%m%d)
   
   # Initialize fresh PKI
   ./easyrsa init-pki
   ./easyrsa build-ca nopass
   ./easyrsa build-server-full server nopass
   ./easyrsa gen-dh
   
   # Generate TLS-auth key
   openvpn --genkey --secret ../certificates/ta.key
   ```

#### Certificate Format Issues

**Symptoms:**
- "Invalid certificate format" errors
- Parsing errors in OpenVPN logs
- Corrupted certificate files

**Solutions:**

1. **Check Certificate Format**
   ```bash
   # Verify certificate format
   openssl x509 -in certificates/server.crt -text -noout
   
   # Check for proper PEM format
   head -1 certificates/server.crt  # Should be -----BEGIN CERTIFICATE-----
   tail -1 certificates/server.crt  # Should be -----END CERTIFICATE-----
   ```

2. **Convert Certificate Format**
   ```bash
   # Convert DER to PEM if needed
   openssl x509 -inform DER -in certificate.der -outform PEM -out certificate.pem
   
   # Verify converted certificate
   openssl x509 -in certificate.pem -text -noout
   ```

## Certificate Backup and Recovery

### Backup Certificate Issues

**Symptoms:**
- Cannot create certificate backups
- Backup files corrupted
- Missing certificates after restore

**Solutions:**

1. **Create Proper Certificate Backup**
   ```bash
   # Create comprehensive backup
   BACKUP_DIR="certificate-backups/backup-$(date +%Y-%m-%dT%H-%M-%S)"
   mkdir -p "$BACKUP_DIR"
   
   # Backup PKI directory
   cp -r easy-rsa/pki "$BACKUP_DIR/"
   
   # Backup certificates directory
   cp -r certificates "$BACKUP_DIR/"
   
   # Create checksums
   find "$BACKUP_DIR" -type f -exec sha256sum {} \; > "$BACKUP_DIR/checksums.txt"
   
   # Compress backup
   tar -czf "${BACKUP_DIR}.tar.gz" -C certificate-backups "$(basename "$BACKUP_DIR")"
   ```

2. **Verify Backup Integrity**
   ```bash
   # Extract and verify backup
   tar -xzf backup.tar.gz -C /tmp/
   
   # Verify checksums
   cd /tmp/backup-directory
   sha256sum -c checksums.txt
   ```

### Certificate Recovery

**Symptoms:**
- Lost certificate files
- Corrupted PKI directory
- Need to restore from backup

**Solutions:**

1. **Restore from Backup**
   ```bash
   # Stop OpenVPN service
   sudo systemctl stop openvpn@server
   
   # Backup current state
   cp -r easy-rsa/pki easy-rsa/pki.corrupted.$(date +%Y%m%d)
   cp -r certificates certificates.corrupted.$(date +%Y%m%d)
   
   # Extract backup
   tar -xzf backup.tar.gz -C /tmp/
   
   # Restore files
   cp -r /tmp/backup-*/pki easy-rsa/
   cp -r /tmp/backup-*/certificates ./
   
   # Set proper permissions
   chmod 600 easy-rsa/pki/private/*.key
   chmod 644 easy-rsa/pki/issued/*.crt
   chmod 600 certificates/*.key
   chmod 644 certificates/*.crt
   
   # Restart OpenVPN
   sudo systemctl start openvpn@server
   ```

## Certificate Monitoring

### Certificate Expiration Monitoring

**Symptoms:**
- Certificates expiring without notice
- Service interruptions due to expired certificates

**Solutions:**

1. **Set Up Expiration Monitoring**
   ```bash
   # Create monitoring script
   cat > scripts/check-cert-expiration.sh << 'EOF'
   #!/bin/bash
   WARN_DAYS=30
   CRITICAL_DAYS=7
   
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
       echo "🚨 CRITICAL: $cert_name expires in $days_left days"
     elif [ $days_left -lt $WARN_DAYS ]; then
       echo "⚠️  WARNING: $cert_name expires in $days_left days"
     else
       echo "✅ OK: $cert_name expires in $days_left days"
     fi
   }
   
   # Check all certificates
   check_cert "easy-rsa/pki/ca.crt" "Certificate Authority"
   check_cert "certificates/server.crt" "Server Certificate"
   
   for cert in certificates/*.crt; do
     if [ -f "$cert" ] && [ "$(basename "$cert")" != "server.crt" ]; then
       client_name=$(basename "$cert" .crt)
       check_cert "$cert" "Client: $client_name"
     fi
   done
   EOF
   
   chmod +x scripts/check-cert-expiration.sh
   ```

2. **Schedule Regular Checks**
   ```bash
   # Add to crontab
   (crontab -l 2>/dev/null; echo "0 9 * * * /path/to/scripts/check-cert-expiration.sh") | crontab -
   ```

## Diagnostic Commands

### Certificate Status Check

```bash
# Check all certificate files
ls -la certificates/
ls -la easy-rsa/pki/issued/
ls -la easy-rsa/pki/private/

# Verify certificate chain
openssl verify -CAfile certificates/ca.crt certificates/server.crt

# Check certificate details
openssl x509 -in certificates/server.crt -text -noout

# Test certificate loading
sudo openvpn --config /etc/openvpn/openvpn.conf --test-crypto
```

### Certificate Validation

```bash
# Validate all certificates
for cert in certificates/*.crt; do
  echo "Checking $cert:"
  openssl x509 -in "$cert" -noout -dates
  openssl verify -CAfile certificates/ca.crt "$cert"
  echo
done

# Check CRL status
openssl crl -in certificates/crl.pem -text -noout
```

## Related Documentation

- [Certificate Configuration](../configuration/certificates.md) - Certificate setup
- [Authentication Issues](authentication.md) - Authentication troubleshooting
- [Common Issues](common-issues.md) - General troubleshooting
- [Recovery Procedures](recovery.md) - Emergency procedures

---
**Previous**: [Authentication Issues](authentication.md) | **Next**: [Network Issues](network.md) | **Up**: [Troubleshooting](README.md)