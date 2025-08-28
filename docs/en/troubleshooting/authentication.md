# Authentication Troubleshooting

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [Troubleshooting](README.md) > Authentication

🌐 **Language**: [English](../../en/troubleshooting/authentication.md) | [Русский](../../ru/troubleshooting/authentication.md)

This guide helps resolve authentication-related issues with the Family VPN Server.

## Common Authentication Issues

### Web Interface Login Problems

#### Cannot Login to Management Interface

**Symptoms:**
- Login page shows "Invalid credentials" error
- Unable to access web interface at port 3000

**Solutions:**

1. **Check Admin Credentials**
   ```bash
   # Verify admin username in .env file
   grep VPN_USERNAME .env
   
   # Reset admin password
   npm run setup-auth
   ```

2. **Verify Password Hash**
   ```bash
   # Check if password hash exists
   grep VPN_PASSWORD_HASH .env
   
   # Generate new hash manually
   node -e "console.log(require('bcrypt').hashSync('your-password', 12))"
   ```

3. **Check JWT Secrets**
   ```bash
   # Verify JWT secrets exist
   grep JWT_SECRET .env
   grep SESSION_SECRET .env
   
   # Regenerate secrets if missing
   npm run setup-auth
   ```

#### Session Expires Too Quickly

**Symptoms:**
- Frequent logouts from web interface
- Session timeout errors

**Solutions:**

1. **Adjust Session Timeout**
   ```env
   # In .env file - increase session timeout (30 minutes = 1800000ms)
   SESSION_TIMEOUT=3600000  # 1 hour
   JWT_EXPIRY=30m          # 30 minutes
   ```

2. **Check System Clock**
   ```bash
   # Verify system time is correct
   date
   timedatectl status  # On systemd systems
   ```

### VPN Client Authentication Issues

#### Client Certificate Authentication Failures

**Symptoms:**
- VPN clients cannot connect
- "TLS handshake failed" errors
- Certificate verification errors

**Solutions:**

1. **Verify Certificate Validity**
   ```bash
   # Check certificate expiration
   openssl x509 -in certificates/client-name.crt -enddate -noout
   
   # Verify certificate against CA
   openssl verify -CAfile certificates/ca.crt certificates/client-name.crt
   ```

2. **Check Certificate Chain**
   ```bash
   # Ensure all required certificates exist
   ls -la certificates/
   # Should contain: ca.crt, server.crt, server.key, ta.key
   ```

3. **Regenerate Client Certificate**
   ```bash
   # Revoke old certificate
   cd easy-rsa
   ./easyrsa revoke client-name
   
   # Generate new certificate
   ./easyrsa build-client-full client-name nopass
   
   # Update CRL
   ./easyrsa gen-crl
   cp pki/crl.pem ../certificates/
   ```

#### TLS Authentication Failures

**Symptoms:**
- "TLS Error: TLS key negotiation failed" messages
- Connection drops during handshake

**Solutions:**

1. **Check TLS-Auth Key**
   ```bash
   # Verify ta.key exists and is readable
   ls -la certificates/ta.key
   
   # Regenerate if corrupted
   openvpn --genkey --secret certificates/ta.key
   ```

2. **Verify OpenVPN Configuration**
   ```conf
   # In openvpn.conf - ensure TLS settings match
   tls-auth ta.key 0
   tls-version-min 1.2
   cipher AES-256-GCM
   auth SHA256
   ```

## Account Lockout Issues

### Too Many Failed Login Attempts

**Symptoms:**
- "Account locked" messages
- Cannot login even with correct credentials

**Solutions:**

1. **Check Lockout Status**
   ```bash
   # View security logs
   tail -f logs/security.log | grep lockout
   
   # Check current lockout settings
   grep -E "(MAX_FAILED_ATTEMPTS|LOCKOUT_DURATION)" .env
   ```

2. **Reset Account Lockout**
   ```bash
   # Restart the server to clear lockouts
   npm run dev  # or restart production server
   
   # Or adjust lockout settings in .env
   MAX_FAILED_ATTEMPTS=10
   LOCKOUT_DURATION=300000  # 5 minutes
   ```

### IP-Based Restrictions

**Symptoms:**
- Cannot access from certain IP addresses
- "Access denied" errors

**Solutions:**

1. **Check IP Validation Settings**
   ```env
   # In .env file - disable IP validation for testing
   ENFORCE_IP_VALIDATION=false
   ```

2. **Review Firewall Rules**
   ```bash
   # Check UFW status
   sudo ufw status verbose
   
   # Check iptables rules
   sudo iptables -L -n | grep 3000
   ```

## JWT Token Issues

### Invalid or Expired Tokens

**Symptoms:**
- "Invalid token" errors in API calls
- Automatic logouts
- 401 Unauthorized responses

**Solutions:**

1. **Check Token Configuration**
   ```bash
   # Verify JWT settings in .env
   grep -E "(JWT_.*)" .env
   
   # Ensure secrets are properly set
   node -e "
   require('dotenv').config();
   console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
   console.log('JWT_REFRESH_SECRET length:', process.env.JWT_REFRESH_SECRET?.length);
   "
   ```

2. **Regenerate JWT Secrets**
   ```bash
   # Generate new secrets
   npm run setup-auth
   
   # Or manually generate
   node -e "
   const crypto = require('crypto');
   console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
   console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(32).toString('hex'));
   "
   ```

3. **Clear Browser Storage**
   ```javascript
   // In browser console - clear stored tokens
   localStorage.clear();
   sessionStorage.clear();
   ```

## Database Authentication Issues

### Session Store Problems

**Symptoms:**
- Sessions not persisting
- Random logouts
- "Session store error" messages

**Solutions:**

1. **Check Session Configuration**
   ```bash
   # Verify session store is working
   # Check logs for session-related errors
   tail -f logs/application-*.log | grep -i session
   ```

2. **Reset Session Store**
   ```bash
   # Restart server to clear session store
   npm run dev
   
   # Check session directory permissions (if file-based)
   ls -la sessions/  # if using file sessions
   ```

## Security-Related Authentication Issues

### Brute Force Protection

**Symptoms:**
- Legitimate users cannot login
- High number of failed attempts in logs

**Solutions:**

1. **Review Security Logs**
   ```bash
   # Check for suspicious activity
   tail -100 logs/security.log | grep -E "(failed|lockout|suspicious)"
   
   # Check IP addresses in logs
   grep "login_failure" logs/security.log | awk '{print $NF}' | sort | uniq -c
   ```

2. **Adjust Rate Limiting**
   ```env
   # In .env file - adjust rate limiting
   RATE_LIMIT_MAX=50        # Increase max requests
   RATE_LIMIT_WINDOW=15     # Time window in minutes
   MAX_FAILED_ATTEMPTS=5    # Failed attempts before lockout
   ```

### SSL/TLS Certificate Issues

**Symptoms:**
- Browser security warnings
- "Certificate not trusted" errors
- HTTPS connection failures

**Solutions:**

1. **Check SSL Certificate**
   ```bash
   # Test SSL certificate
   openssl s_client -connect localhost:3000 -servername localhost
   
   # Check certificate expiration
   openssl x509 -in ssl/cert.pem -enddate -noout
   ```

2. **Regenerate SSL Certificate**
   ```bash
   # Generate new self-signed certificate
   openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
   
   # Or use Let's Encrypt for production
   certbot certonly --standalone -d your-domain.com
   ```

## Diagnostic Commands

### Authentication Status Check

```bash
# Test authentication endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Check server status
curl http://localhost:3000/api/health

# Verify JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/auth/verify
```

### Log Analysis

```bash
# Monitor authentication attempts
tail -f logs/security.log | grep -E "(login|auth)"

# Check for errors
grep -i error logs/application-*.log | grep -i auth

# View recent security events
tail -50 logs/security.log
```

## Prevention and Best Practices

### Secure Authentication Setup

1. **Use Strong Passwords**
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

2. **Regular Security Audits**
   ```bash
   # Run security scan
   npm run security-scan
   
   # Check for weak configurations
   npm run validate:docs
   ```

3. **Monitor Authentication Logs**
   ```bash
   # Set up log monitoring
   tail -f logs/security.log | grep -E "(failed|lockout|suspicious)"
   ```

## Related Documentation

- [Security Configuration](../security/authentication.md) - Authentication setup
- [Certificate Management](../configuration/certificates.md) - Certificate troubleshooting
- [Common Issues](common-issues.md) - General troubleshooting
- [Recovery Procedures](recovery.md) - Emergency procedures

---
**Previous**: [Troubleshooting Home](README.md) | **Next**: [Certificate Issues](certificates.md) | **Up**: [Troubleshooting](README.md)