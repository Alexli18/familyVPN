# Security Configuration

This guide covers comprehensive security configuration for the Family VPN Server, including authentication, encryption, access control, and security hardening.

## Overview

Security configuration is critical for protecting your VPN server and ensuring safe operation. This guide covers all security aspects from basic authentication to advanced hardening techniques.

## Authentication Configuration

### Admin Authentication Setup

#### Initial Authentication Setup
```bash
# Run the authentication setup script
npm run setup-auth

# This will prompt for:
# - Admin username
# - Admin password
# - Generate secure JWT secrets
```

#### Manual Authentication Configuration
```env
# .env file authentication settings
VPN_USERNAME=admin
VPN_PASSWORD_HASH=$2b$12$generated.bcrypt.hash.here
JWT_SECRET=64-character-hex-string
JWT_REFRESH_SECRET=64-character-hex-string
SESSION_SECRET=64-character-hex-string
```

#### Generate Password Hash Manually
```bash
# Generate bcrypt hash for password
node -e "
const bcrypt = require('bcrypt');
const password = 'your-secure-password';
const hash = bcrypt.hashSync(password, 12);
console.log('Password hash:', hash);
"
```

#### Generate JWT Secrets
```bash
# Generate cryptographically secure secrets
node -e "
const crypto = require('crypto');
console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));
"
```

### JWT Token Configuration

#### Token Settings
```env
# JWT token expiration times
JWT_EXPIRY=15m              # Access token (15 minutes)
JWT_REFRESH_EXPIRY=7d       # Refresh token (7 days)

# Token validation settings
ENFORCE_IP_VALIDATION=true  # Bind tokens to IP addresses
JWT_ISSUER=family-vpn-server
JWT_AUDIENCE=vpn-clients
```

#### Advanced JWT Configuration
```javascript
// src/config/jwt.js
module.exports = {
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  options: {
    expiresIn: process.env.JWT_EXPIRY || '15m',
    issuer: process.env.JWT_ISSUER || 'family-vpn-server',
    audience: process.env.JWT_AUDIENCE || 'vpn-clients',
    algorithm: 'HS256'
  },
  refreshOptions: {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'family-vpn-server',
    audience: process.env.JWT_AUDIENCE || 'vpn-clients',
    algorithm: 'HS256'
  }
};
```

### Session Security

#### Session Configuration
```env
# Session security settings
SESSION_SECRET=64-character-hex-string
SESSION_TIMEOUT=1800000     # 30 minutes in milliseconds
SESSION_SECURE=true         # Require HTTPS for cookies
SESSION_HTTP_ONLY=true      # Prevent XSS attacks
SESSION_SAME_SITE=strict    # CSRF protection
```

#### Session Store Configuration
```javascript
// Enhanced session configuration
const session = require('express-session');

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,                                // Prevent XSS
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 1800000, // 30 minutes
    sameSite: 'strict'                            // CSRF protection
  },
  name: 'vpn.sid' // Custom session name
};
```

## Access Control Configuration

### Rate Limiting

#### Basic Rate Limiting
```env
# Rate limiting configuration
RATE_LIMIT_WINDOW=15        # Window in minutes
RATE_LIMIT_MAX=100          # Max requests per window
RATE_LIMIT_SKIP_SUCCESS=false # Count successful requests

# Slow down configuration
SLOW_DOWN_THRESHOLD=50      # Requests before slowing down
SLOW_DOWN_DELAY=500         # Delay increment in ms
SLOW_DOWN_MAX_DELAY=20000   # Maximum delay in ms
```

#### Advanced Rate Limiting
```javascript
// src/middleware/rate-limit.js
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiting for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts'
});

// Progressive delay for repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: parseInt(process.env.SLOW_DOWN_THRESHOLD),
  delayMs: parseInt(process.env.SLOW_DOWN_DELAY)
});
```

### Account Lockout Protection

#### Lockout Configuration
```env
# Account lockout settings
MAX_FAILED_ATTEMPTS=5       # Failed attempts before lockout
LOCKOUT_DURATION=900000     # Lockout duration (15 minutes)
LOCKOUT_INCREMENT=true      # Increase lockout time with repeated failures
```

#### Lockout Implementation
```javascript
// src/middleware/account-lockout.js
class AccountLockout {
  constructor() {
    this.attempts = new Map();
    this.lockouts = new Map();
  }

  isLocked(ip) {
    const lockout = this.lockouts.get(ip);
    if (lockout && Date.now() < lockout.until) {
      return true;
    }
    if (lockout && Date.now() >= lockout.until) {
      this.lockouts.delete(ip);
      this.attempts.delete(ip);
    }
    return false;
  }

  recordFailure(ip) {
    const attempts = this.attempts.get(ip) || { count: 0, firstAttempt: Date.now() };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.attempts.set(ip, attempts);

    if (attempts.count >= parseInt(process.env.MAX_FAILED_ATTEMPTS)) {
      const duration = parseInt(process.env.LOCKOUT_DURATION);
      this.lockouts.set(ip, {
        until: Date.now() + duration,
        attempts: attempts.count
      });
    }
  }

  recordSuccess(ip) {
    this.attempts.delete(ip);
    this.lockouts.delete(ip);
  }
}
```

## Encryption Configuration

### OpenVPN Encryption Settings

#### Strong Encryption Configuration
```conf
# OpenVPN security configuration (openvpn.conf)

# Encryption cipher (AES-256-GCM recommended)
cipher AES-256-GCM
data-ciphers AES-256-GCM:AES-128-GCM:AES-256-CBC

# Authentication digest
auth SHA256

# TLS security
tls-version-min 1.2
tls-cipher TLS-ECDHE-RSA-WITH-AES-256-GCM-SHA384:TLS-ECDHE-ECDSA-WITH-AES-256-GCM-SHA384

# Perfect Forward Secrecy
tls-crypt ta.key

# Certificate verification
remote-cert-tls client
verify-client-cert require

# Additional security
reneg-sec 3600
```

#### Certificate Security Parameters
```env
# Certificate configuration
CERT_KEY_SIZE=2048          # RSA key size (2048 minimum, 4096 for high security)
CERT_VALIDITY_DAYS=365      # Certificate validity period
CERT_DIGEST=sha256          # Certificate signing digest

# Certificate authority settings
CA_KEY_SIZE=4096            # CA key size (higher security for CA)
CA_VALIDITY_DAYS=3650       # CA validity (10 years)
```

### TLS/SSL Configuration

#### Web Interface SSL
```env
# SSL/TLS configuration for web interface
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/key.pem
SSL_CA_PATH=/path/to/ssl/ca.pem

# SSL security settings
SSL_PROTOCOLS=TLSv1.2,TLSv1.3
SSL_CIPHERS=ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS
SSL_PREFER_SERVER_CIPHERS=true
```

#### Generate SSL Certificates
```bash
# Self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Let's Encrypt for production
certbot certonly --standalone -d your-domain.com
```

## Security Hardening

### Application Security Headers

#### Security Headers Configuration
```javascript
// src/middleware/security-headers.js
const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

### Input Validation and Sanitization

#### Input Validation Rules
```javascript
// src/middleware/validation.js
const { body, param, validationResult } = require('express-validator');

const clientNameValidation = [
  body('clientName')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage('Client name must be 3-50 characters, alphanumeric, hyphens, and underscores only')
];

const passwordValidation = [
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character')
];
```

### File System Security

#### Secure File Permissions
```bash
# Set secure permissions for configuration files
chmod 600 .env
chmod 600 certificates/*.key
chmod 644 certificates/*.crt
chmod 755 certificates/

# Set ownership
chown -R vpnuser:vpnuser /path/to/vpn/server
```

#### Path Traversal Protection
```javascript
// src/utils/path-security.js
const path = require('path');

function sanitizePath(userPath, basePath) {
  const resolvedPath = path.resolve(basePath, userPath);
  const normalizedBase = path.resolve(basePath);
  
  if (!resolvedPath.startsWith(normalizedBase)) {
    throw new Error('Path traversal attempt detected');
  }
  
  return resolvedPath;
}
```

## Firewall Configuration

### System Firewall Rules

#### UFW (Ubuntu/Debian)
```bash
# Reset firewall
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if needed)
sudo ufw allow ssh

# Allow OpenVPN
sudo ufw allow 1194/udp

# Allow web interface (restrict to admin IPs)
sudo ufw allow from YOUR_ADMIN_IP to any port 3000

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### iptables Rules
```bash
# Flush existing rules
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X

# Default policies
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow OpenVPN
sudo iptables -A INPUT -p udp --dport 1194 -j ACCEPT

# Allow web interface from admin IP
sudo iptables -A INPUT -p tcp --dport 3000 -s YOUR_ADMIN_IP -j ACCEPT

# NAT for VPN clients
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

### Application-Level Firewall

#### IP Whitelist/Blacklist
```javascript
// src/middleware/ip-filter.js
class IPFilter {
  constructor() {
    this.whitelist = new Set(process.env.ADMIN_IPS?.split(',') || []);
    this.blacklist = new Set();
  }

  middleware() {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (this.blacklist.has(clientIP)) {
        return res.status(403).json({ error: 'IP address blocked' });
      }
      
      // For admin endpoints, check whitelist
      if (req.path.startsWith('/admin') && this.whitelist.size > 0) {
        if (!this.whitelist.has(clientIP)) {
          return res.status(403).json({ error: 'IP address not authorized' });
        }
      }
      
      next();
    };
  }
}
```

## Monitoring and Logging

### Security Event Logging

#### Security Logger Configuration
```javascript
// src/services/security-logger.js
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'info'
    }),
    new winston.transports.File({
      filename: 'logs/security-error.log',
      level: 'error'
    })
  ]
});

// Security event types
const SecurityEvents = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  ACCOUNT_LOCKED: 'account_locked',
  CERT_GENERATED: 'certificate_generated',
  CERT_REVOKED: 'certificate_revoked',
  CONFIG_CHANGED: 'configuration_changed',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};
```

#### Log Security Events
```javascript
// Log security events
function logSecurityEvent(event, details) {
  securityLogger.info({
    event: event,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    user: details.user,
    details: details.details
  });
}

// Usage examples
logSecurityEvent(SecurityEvents.LOGIN_SUCCESS, {
  ip: req.ip,
  user: username,
  details: { userAgent: req.get('User-Agent') }
});

logSecurityEvent(SecurityEvents.CERT_GENERATED, {
  ip: req.ip,
  user: username,
  details: { clientName: clientName }
});
```

### Intrusion Detection

#### Failed Login Monitoring
```javascript
// src/middleware/intrusion-detection.js
class IntrusionDetection {
  constructor() {
    this.suspiciousIPs = new Map();
  }

  monitorFailedLogins(ip) {
    const now = Date.now();
    const window = 60 * 60 * 1000; // 1 hour
    
    if (!this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.set(ip, []);
    }
    
    const attempts = this.suspiciousIPs.get(ip);
    attempts.push(now);
    
    // Remove old attempts
    const recentAttempts = attempts.filter(time => now - time < window);
    this.suspiciousIPs.set(ip, recentAttempts);
    
    // Alert if too many failures
    if (recentAttempts.length > 10) {
      this.alertSuspiciousActivity(ip, recentAttempts.length);
    }
  }

  alertSuspiciousActivity(ip, attemptCount) {
    logSecurityEvent(SecurityEvents.SUSPICIOUS_ACTIVITY, {
      ip: ip,
      details: { 
        type: 'excessive_failed_logins',
        count: attemptCount,
        timeWindow: '1 hour'
      }
    });
  }
}
```

## Security Scanning and Auditing

### Automated Security Scanning

#### Security Scan Script
```bash
#!/bin/bash
# scripts/security-scan.sh

echo "🔍 Running security scan..."

# Check file permissions
echo "Checking file permissions..."
find . -name "*.key" -not -perm 600 -exec echo "❌ Insecure key file: {}" \;
find . -name ".env" -not -perm 600 -exec echo "❌ Insecure .env file: {}" \;

# Check for default passwords
echo "Checking for default credentials..."
if grep -q "admin:admin" .env 2>/dev/null; then
  echo "❌ Default admin credentials detected"
fi

# Check certificate expiration
echo "Checking certificate expiration..."
for cert in certificates/*.crt; do
  if [ -f "$cert" ]; then
    expiry=$(openssl x509 -enddate -noout -in "$cert" | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry" +%s)
    current_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ $days_left -lt 30 ]; then
      echo "⚠️  Certificate $cert expires in $days_left days"
    fi
  fi
done

# Check for weak configurations
echo "Checking OpenVPN configuration..."
if grep -q "cipher DES" certificates/openvpn.conf 2>/dev/null; then
  echo "❌ Weak cipher detected in OpenVPN config"
fi

echo "✅ Security scan completed"
```

### Regular Security Audits

#### Security Checklist
```bash
# Create security audit checklist
cat > security-checklist.md << 'EOF'
# Security Audit Checklist

## Authentication
- [ ] Strong admin password set
- [ ] JWT secrets are cryptographically secure
- [ ] Account lockout is configured
- [ ] Rate limiting is enabled

## Encryption
- [ ] Strong OpenVPN ciphers configured
- [ ] TLS 1.2+ enforced
- [ ] Certificate key sizes are adequate (2048+ bits)
- [ ] Perfect Forward Secrecy enabled

## Access Control
- [ ] Firewall rules are restrictive
- [ ] Admin interface access is limited
- [ ] File permissions are secure
- [ ] Input validation is implemented

## Monitoring
- [ ] Security logging is enabled
- [ ] Log files are monitored
- [ ] Certificate expiration monitoring
- [ ] Failed login attempt monitoring

## Maintenance
- [ ] Regular security updates applied
- [ ] Certificates renewed before expiration
- [ ] Security configurations reviewed
- [ ] Backup procedures tested
EOF
```

## Security Best Practices

### Password Security
```bash
# Generate strong passwords
openssl rand -base64 32

# Password policy enforcement
# Minimum 12 characters, mixed case, numbers, symbols
```

### Certificate Security
```bash
# Use strong key sizes
CERT_KEY_SIZE=4096  # For high security environments

# Regular certificate rotation
# Rotate certificates annually or bi-annually

# Secure certificate storage
chmod 600 certificates/*.key
```

### Network Security
```bash
# Use non-standard ports (security through obscurity)
VPN_PORT=1195
API_PORT=8443

# Implement fail2ban for additional protection
sudo apt install fail2ban
```

### Operational Security
```bash
# Regular security updates
sudo apt update && sudo apt upgrade

# Monitor security logs
tail -f logs/security.log

# Regular backups of security configuration
tar -czf security-backup-$(date +%Y%m%d).tar.gz .env certificates/
```

## Troubleshooting Security Issues

### Common Security Problems

#### Authentication Issues
```bash
# Check password hash
node -e "
const bcrypt = require('bcrypt');
console.log(bcrypt.compareSync('your-password', process.env.VPN_PASSWORD_HASH));
"

# Verify JWT secrets
node -e "
require('dotenv').config();
console.log('JWT Secret length:', process.env.JWT_SECRET?.length);
"
```

#### Certificate Problems
```bash
# Verify certificate validity
openssl x509 -in certificates/server.crt -text -noout

# Check certificate chain
openssl verify -CAfile certificates/ca.crt certificates/server.crt
```

#### Firewall Issues
```bash
# Test port accessibility
nmap -p 1194 -sU localhost
telnet localhost 3000

# Check firewall status
sudo ufw status verbose
sudo iptables -L -n
```

## Next Steps

After configuring security:

1. **[Network Configuration](networking.md)** - Set up networking and routing
2. **[Certificate Configuration](certificates.md)** - Configure PKI and certificates
3. **[Monitoring Setup](../troubleshooting/diagnostics.md)** - Set up monitoring and alerting