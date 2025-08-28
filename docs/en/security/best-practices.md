# Security Best Practices

## Overview

This document provides comprehensive security best practices for deploying, configuring, and maintaining the Family VPN Server. Following these guidelines ensures optimal security posture and protection against common threats.

## Deployment Security

### Initial Setup Security

#### Secure Installation Environment
- **Clean System**: Start with a fresh, updated operating system
- **Minimal Installation**: Install only necessary packages and services
- **Security Updates**: Apply all security patches before deployment
- **Firewall Configuration**: Configure firewall before starting services

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install only essential packages
sudo apt install -y curl wget gnupg2 software-properties-common

# Configure basic firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

#### Secure Docker Deployment
- **Non-root User**: Run containers as non-root user
- **Resource Limits**: Set appropriate CPU and memory limits
- **Network Isolation**: Use custom Docker networks
- **Image Security**: Use official, minimal base images

```yaml
# docker-compose.yml security configuration
version: '3.8'
services:
  vpn-server:
    image: family-vpn-server:latest
    user: "1001:1001"
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    cap_drop:
      - ALL
    cap_add:
      - NET_ADMIN
      - NET_RAW
    security_opt:
      - no-new-privileges:true
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

### Network Security

#### Firewall Configuration
- **Default Deny**: Block all traffic by default
- **Minimal Exposure**: Open only necessary ports
- **Source Restrictions**: Limit management access by IP
- **Regular Audits**: Review firewall rules regularly

```bash
# Production firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing

# VPN traffic
sudo ufw allow 1194/udp comment 'OpenVPN'

# Management API (restricted)
sudo ufw allow from 192.168.1.0/24 to any port 3000 comment 'Management API'

# SSH (change default port)
sudo ufw allow 2222/tcp comment 'SSH'
```

#### Network Segmentation
- **VPN Subnet**: Use dedicated subnet for VPN clients
- **Management Network**: Separate management from client traffic
- **DMZ Configuration**: Place VPN server in DMZ if possible
- **VLAN Isolation**: Use VLANs for network segmentation

### Cloud Security

#### AWS Security Best Practices
```bash
# Security Group configuration
aws ec2 create-security-group \
  --group-name vpn-server-sg \
  --description "VPN Server Security Group"

# Allow VPN traffic
aws ec2 authorize-security-group-ingress \
  --group-name vpn-server-sg \
  --protocol udp \
  --port 1194 \
  --cidr 0.0.0.0/0

# Restrict management access
aws ec2 authorize-security-group-ingress \
  --group-name vpn-server-sg \
  --protocol tcp \
  --port 3000 \
  --source-group sg-management
```

#### Google Cloud Security
```bash
# Create firewall rules
gcloud compute firewall-rules create allow-vpn-traffic \
  --allow udp:1194 \
  --source-ranges 0.0.0.0/0 \
  --target-tags vpn-server

gcloud compute firewall-rules create allow-vpn-management \
  --allow tcp:3000 \
  --source-ranges YOUR_ADMIN_IP/32 \
  --target-tags vpn-server
```

## Authentication Security

### Password Security

#### Strong Password Policy
- **Minimum Length**: 12 characters minimum
- **Complexity**: Mix of uppercase, lowercase, numbers, symbols
- **No Dictionary Words**: Avoid common words and patterns
- **Regular Updates**: Change passwords every 90 days

```javascript
// Password strength validation
function validatePassword(password) {
    const minLength = 12;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && 
           hasUpper && hasLower && hasNumber && hasSymbol;
}
```

#### Secure Password Storage
- **bcrypt Hashing**: Use bcrypt with minimum 12 rounds
- **Unique Salts**: Each password gets unique salt
- **No Plain Text**: Never store passwords in plain text
- **Secure Comparison**: Use constant-time comparison

```javascript
const bcrypt = require('bcrypt');

// Secure password hashing
async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// Secure password verification
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}
```

### Multi-Factor Authentication (Future Enhancement)

#### TOTP Implementation
- **Time-based OTP**: Use TOTP for second factor
- **QR Code Setup**: Provide QR codes for easy setup
- **Backup Codes**: Generate backup codes for recovery
- **Rate Limiting**: Limit OTP verification attempts

### Session Security

#### Secure Session Configuration
```javascript
const session = require('express-session');

app.use(session({
    secret: process.env.SESSION_SECRET,
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    },
    genid: () => {
        return crypto.randomUUID();
    }
}));
```

## Certificate Management Security

### PKI Security

#### CA Security
- **Offline CA**: Keep root CA offline when possible
- **Strong Keys**: Use 4096-bit RSA or P-384 ECDSA
- **Secure Storage**: Protect CA private key with encryption
- **Access Control**: Limit CA access to authorized personnel

```bash
# Generate secure CA key
openssl genrsa -aes256 -out ca-key.pem 4096

# Create CA certificate
openssl req -new -x509 -days 3650 -key ca-key.pem -sha256 -out ca.pem
```

#### Certificate Lifecycle Management
- **Regular Rotation**: Rotate certificates before expiration
- **Revocation Process**: Implement proper revocation procedures
- **CRL Updates**: Keep Certificate Revocation List updated
- **Monitoring**: Monitor certificate expiration dates

```bash
# Check certificate expiration
openssl x509 -in certificate.crt -noout -dates

# Generate CRL
openssl ca -config openssl.cnf -gencrl -out crl.pem
```

### Client Certificate Security

#### Certificate Distribution
- **Secure Channels**: Distribute certificates over HTTPS
- **One-time Downloads**: Implement one-time download links
- **Access Logging**: Log all certificate downloads
- **Expiration Notifications**: Notify before certificate expiration

#### Certificate Validation
- **Chain Validation**: Validate complete certificate chain
- **Revocation Checking**: Check CRL for revoked certificates
- **Key Usage**: Validate certificate key usage extensions
- **Common Name**: Verify certificate common name

## Operational Security

### System Hardening

#### Operating System Hardening
```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable cups
sudo systemctl disable avahi-daemon

# Configure kernel parameters
echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
echo 'net.ipv4.conf.all.send_redirects=0' >> /etc/sysctl.conf
echo 'net.ipv4.conf.all.accept_redirects=0' >> /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

#### File System Security
```bash
# Set secure permissions
chmod 600 /etc/openvpn/server.conf
chmod 600 /etc/openvpn/ca.key
chmod 644 /etc/openvpn/ca.crt

# Create dedicated user
sudo useradd -r -s /bin/false openvpn
sudo chown -R openvpn:openvpn /etc/openvpn
```

### Monitoring and Alerting

#### Security Monitoring
- **Log Analysis**: Regular analysis of security logs
- **Anomaly Detection**: Automated detection of unusual patterns
- **Real-time Alerts**: Immediate alerts for critical events
- **Baseline Establishment**: Establish normal behavior baselines

```bash
# Monitor authentication failures
tail -f logs/security-*.log | grep "auth_failure" | \
  jq -r 'select(.attemptCount >= 3) | .clientIP' | \
  sort | uniq -c | sort -nr
```

#### Performance Monitoring
- **Resource Usage**: Monitor CPU, memory, disk usage
- **Connection Metrics**: Track VPN connection statistics
- **Network Traffic**: Monitor network traffic patterns
- **Service Health**: Regular health checks of all services

### Backup and Recovery

#### Secure Backups
- **Regular Backups**: Automated daily backups
- **Encryption**: Encrypt all backup data
- **Offsite Storage**: Store backups in separate location
- **Recovery Testing**: Regular recovery procedure testing

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backup/vpn-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup certificates
tar -czf "$BACKUP_DIR/certificates.tar.gz" /etc/openvpn/

# Backup configuration
cp /etc/openvpn/server.conf "$BACKUP_DIR/"
cp .env "$BACKUP_DIR/env.backup"

# Encrypt backup
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 --symmetric \
    --output "$BACKUP_DIR.gpg" "$BACKUP_DIR"

# Clean up unencrypted backup
rm -rf "$BACKUP_DIR"
```

#### Disaster Recovery
- **Recovery Procedures**: Documented recovery procedures
- **RTO/RPO Targets**: Define recovery time and point objectives
- **Failover Testing**: Regular failover testing
- **Communication Plan**: Clear communication during incidents

## Application Security

### Input Validation

#### API Input Validation
```javascript
const Joi = require('joi');

const loginSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required()
});

function validateLogin(req, res, next) {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
}
```

#### File Upload Security
```javascript
const multer = require('multer');
const path = require('path');

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 1024 * 1024, // 1MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.crt', '.key', '.csr'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});
```

### Error Handling

#### Secure Error Responses
```javascript
function errorHandler(err, req, res, next) {
    // Log detailed error
    logger.error('Application error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    
    // Return generic error to client
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Internal server error' });
    } else {
        res.status(500).json({ error: err.message });
    }
}
```

### Rate Limiting

#### Comprehensive Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
});

// Authentication rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    skipSuccessfulRequests: true,
    message: 'Too many authentication attempts'
});

// Certificate operation rate limiting
const certLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many certificate requests'
});
```

## Compliance and Auditing

### Security Auditing

#### Regular Security Audits
- **Code Reviews**: Regular security-focused code reviews
- **Vulnerability Scanning**: Automated vulnerability scanning
- **Penetration Testing**: Annual penetration testing
- **Compliance Checks**: Regular compliance verification

```bash
# Automated security scanning
npm audit --audit-level moderate
docker scan family-vpn-server:latest
nmap -sS -O localhost
```

#### Audit Logging
```javascript
function auditLog(action, user, details) {
    logger.info('Audit event', {
        timestamp: new Date().toISOString(),
        action: action,
        user: user,
        details: details,
        category: 'audit'
    });
}

// Usage examples
auditLog('certificate_generated', 'admin', { clientName: 'device-01' });
auditLog('config_changed', 'admin', { setting: 'jwt_expiry' });
auditLog('user_login', 'admin', { ip: '192.168.1.100' });
```

### Compliance Requirements

#### Data Protection Compliance
- **Data Minimization**: Collect only necessary data
- **Purpose Limitation**: Use data only for stated purposes
- **Storage Limitation**: Retain data only as long as necessary
- **Security Measures**: Implement appropriate security measures

#### Privacy Considerations
```javascript
// Data anonymization for logs
function anonymizeData(data) {
    return {
        ...data,
        ip: anonymizeIP(data.ip),
        username: hashUsername(data.username),
        timestamp: data.timestamp
    };
}

function anonymizeIP(ip) {
    const parts = ip.split('.');
    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return 'anonymized';
}
```

## Incident Response

### Security Incident Procedures

#### Incident Classification
- **Critical**: System compromise, data breach
- **High**: Service disruption, authentication bypass
- **Medium**: Suspicious activity, configuration issues
- **Low**: Policy violations, minor security issues

#### Response Procedures
1. **Detection**: Automated monitoring and manual reporting
2. **Analysis**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threats and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Document and improve procedures

```bash
# Emergency response script
#!/bin/bash
# incident-response.sh

case "$1" in
    "breach")
        # Immediate containment
        sudo ufw deny in
        sudo systemctl stop openvpn
        echo "System isolated - investigate immediately"
        ;;
    "suspicious")
        # Enhanced monitoring
        tail -f logs/security-*.log | grep -E "(auth_failure|brute_force)"
        ;;
    "recovery")
        # Restore from backup
        sudo systemctl stop openvpn
        restore_from_backup
        sudo systemctl start openvpn
        ;;
esac
```

### Communication Plan

#### Internal Communication
- **Incident Team**: Designated incident response team
- **Escalation Path**: Clear escalation procedures
- **Status Updates**: Regular status updates during incidents
- **Documentation**: Complete incident documentation

#### External Communication
- **User Notification**: Notify users of service impacts
- **Regulatory Reporting**: Report breaches as required
- **Public Communication**: Coordinate public statements
- **Legal Consultation**: Involve legal team as needed

## Security Training and Awareness

### Administrator Training

#### Security Awareness Topics
- **Threat Landscape**: Current security threats
- **Best Practices**: Security best practices
- **Incident Response**: Response procedures
- **Tool Usage**: Security tool operation

#### Regular Training Schedule
- **Monthly**: Security updates and new threats
- **Quarterly**: Hands-on security exercises
- **Annually**: Comprehensive security training
- **Ad-hoc**: Emergency security briefings

### User Education

#### VPN Security Guidelines
- **Device Security**: Secure device configuration
- **Connection Security**: Safe VPN usage practices
- **Password Security**: Strong password practices
- **Incident Reporting**: How to report security issues

## Continuous Improvement

### Security Metrics

#### Key Performance Indicators
- **Authentication Success Rate**: Target >95%
- **Incident Response Time**: Target <1 hour
- **Vulnerability Remediation**: Target <48 hours
- **Security Training Completion**: Target 100%

#### Regular Reviews
- **Monthly**: Security metrics review
- **Quarterly**: Security posture assessment
- **Annually**: Comprehensive security audit
- **Continuous**: Threat intelligence monitoring

### Technology Updates

#### Update Management
- **Security Patches**: Apply within 48 hours
- **Software Updates**: Regular update schedule
- **Dependency Updates**: Monitor for vulnerabilities
- **Configuration Updates**: Regular configuration reviews

```bash
# Automated update checking
#!/bin/bash
# security-updates.sh

# Check for system updates
apt list --upgradable | grep -i security

# Check for Node.js vulnerabilities
npm audit

# Check Docker image vulnerabilities
docker scan family-vpn-server:latest

# Check certificate expiration
openssl x509 -in ca.crt -noout -checkend 2592000 # 30 days
```

## Related Documentation

- [Security Overview](overview.md) - Complete security architecture
- [Authentication System](authentication.md) - Authentication security details
- [Encryption and Cryptography](encryption.md) - Cryptographic security
- [Security Monitoring](monitoring.md) - Monitoring and logging
- [Deployment Guide](../deployment/production.md) - Secure deployment practices
- [Troubleshooting](../troubleshooting/common-issues.md) - Security troubleshooting