# Common Issues and Solutions

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [Troubleshooting](README.md) > Common Issues

🌐 **Language**: [English](../../en/troubleshooting/common-issues.md) | [Русский](../../ru/troubleshooting/common-issues.md)

## 📚 Section Navigation
- [🏠 Troubleshooting Overview](README.md)
- [🔍 Common Issues](common-issues.md) ← You are here
- [🔧 Diagnostics](diagnostics.md)
- [🔄 Recovery](recovery.md)
- [⚡ Performance](performance.md)
- [🐳 Docker Issues](docker.md)
- [🐧 Linux Issues](linux.md)
- [🍎 macOS Issues](macos.md)
- [🪟 Windows Issues](windows.md)

This guide covers the most frequently encountered problems and their solutions.

## Authentication Issues

### Error: "Authentication failed" / "Invalid credentials"

**Symptoms:**
- Cannot log into web interface
- 401 error when accessing API
- Login form keeps rejecting credentials

**Solutions:**

```bash
# 1. Check authentication settings
cat .env | grep -E "(VPN_USERNAME|VPN_PASSWORD_HASH|JWT_SECRET)"

# 2. Recreate credentials
npm run setup-auth

# 3. Check security logs
tail -f logs/security-$(date +%Y-%m-%d).log

# 4. Reset account lockout (if blocked)
rm -f /tmp/vpn-auth-lockout-*
```

### Error: "Account locked"

**Symptoms:**
- Message about temporary account lockout
- Cannot login even with correct credentials
- Multiple failed login attempts

**Solutions:**

```bash
# 1. Wait for lockout period to expire (15 minutes by default)
# 2. Or manually reset lockout
rm -f /tmp/vpn-auth-lockout-*

# 3. Check lockout settings in .env
echo "MAX_FAILED_ATTEMPTS=5" >> .env
echo "LOCKOUT_DURATION=900000" >> .env
```

## Certificate Issues

### Error: "Certificate generation failed"

**Symptoms:**
- Cannot create client certificates
- Errors when running `npm run generate-client`
- PKI initialization failures

**Solutions:**

```bash
# 1. Check PKI status
ls -la easy-rsa/pki/

# 2. Reinitialize PKI if necessary
npm run clean
npm run init-pki

# 3. Check file permissions
chmod -R 755 easy-rsa/
chmod 600 easy-rsa/pki/private/*

# 4. Verify CA certificate exists
ls -la easy-rsa/pki/ca.crt
```

### Error: "Server certificate invalid"

**Symptoms:**
- OpenVPN server won't start
- Server certificate validation errors
- SSL/TLS handshake failures

**Solutions:**

```bash
# 1. Update server certificate
npm run fix-server-cert

# 2. Check certificate expiration
openssl x509 -in easy-rsa/pki/issued/server.crt -text -noout | grep -A2 "Validity"

# 3. Verify key and certificate match
openssl x509 -noout -modulus -in easy-rsa/pki/issued/server.crt | openssl md5
openssl rsa -noout -modulus -in easy-rsa/pki/private/server.key | openssl md5
```

## Network Issues

### Error: "Connection refused" on port 3000

**Symptoms:**
- Web interface unavailable
- Connection error to http://localhost:3000
- Cannot access management interface

**Solutions:**

```bash
# 1. Check if server is running
ps aux | grep node
netstat -tlnp | grep 3000

# 2. Start the server
npm start

# 3. Check startup logs
tail -f logs/application-$(date +%Y-%m-%d).log

# 4. Check firewall rules
npm run firewall:status
```

### Error: "VPN connection failed"

**Symptoms:**
- Client cannot connect to VPN
- Connection timeouts
- Authentication failures from client

**Solutions:**

```bash
# 1. Check OpenVPN server status
sudo systemctl status openvpn@server
# or
ps aux | grep openvpn

# 2. Check network settings
ip addr show tun0
ip route | grep tun0

# 3. Check firewall rules
npm run firewall:status

# 4. Test DNS resolution
npm run dns:test

# 5. Check OpenVPN logs
sudo tail -f /var/log/openvpn/server.log
```

## Service Issues

### Error: "Port already in use"

**Symptoms:**
- Server fails to start
- "EADDRINUSE" error messages
- Port binding failures

**Solutions:**

```bash
# 1. Find process using the port
lsof -i :3000
lsof -i :1194

# 2. Kill conflicting processes
pkill -f "node.*server.js"
sudo pkill -f openvpn

# 3. Wait and restart
sleep 5
npm start
```

### Error: "Permission denied"

**Symptoms:**
- Cannot access files or directories
- Certificate operations fail
- Service startup failures

**Solutions:**

```bash
# 1. Check file permissions
ls -la easy-rsa/pki/
ls -la certificates/

# 2. Fix permissions
chmod -R 755 easy-rsa/
chmod 600 easy-rsa/pki/private/*
chmod 755 certificates/

# 3. Check user ownership
chown -R $USER:$USER easy-rsa/
chown -R $USER:$USER certificates/
```

## Configuration Issues

### Error: "Missing environment variables"

**Symptoms:**
- Server fails to start
- Configuration validation errors
- Missing .env file

**Solutions:**

```bash
# 1. Check .env file exists
ls -la .env

# 2. Recreate .env file
npm run setup

# 3. Verify required variables
cat .env | grep -E "(VPN_HOST|VPN_SUBNET|JWT_SECRET)"

# 4. Set missing variables manually
echo "VPN_HOST=your-server-ip" >> .env
echo "VPN_SUBNET=10.8.0.0" >> .env
echo "VPN_NETMASK=255.255.255.0" >> .env
```

### Error: "Invalid configuration"

**Symptoms:**
- OpenVPN server won't start
- Configuration parsing errors
- Network setup failures

**Solutions:**

```bash
# 1. Validate OpenVPN configuration
openvpn --config certificates/openvpn.conf --test-crypto

# 2. Check configuration syntax
npm run validate-config

# 3. Regenerate configuration
npm run harden-config

# 4. Check network settings
ip route
iptables -L -n
```

## Quick Fixes

### Reset Everything

```bash
# Complete reset (use with caution)
npm run clean
rm -f .env
npm install
npm run setup
npm run setup-auth
npm run init-pki
npm run harden-config
```

### Restart Services

```bash
# Restart Node.js server
pkill -f "node.*server.js"
npm start

# Restart OpenVPN (system service)
sudo systemctl restart openvpn@server

# Restart Docker containers
npm run docker:down
npm run docker:up
```

### Check System Health

```bash
# Run all tests
npm test

# Check logs for errors
grep -i error logs/*.log

# Check system resources
free -h
df -h
top
```

## Prevention Tips

1. **Regular Backups**: Run `npm run backup:create` weekly
2. **Monitor Logs**: Check logs daily for unusual activity
3. **Update Certificates**: Monitor certificate expiration dates
4. **System Updates**: Keep system and dependencies updated
5. **Security Scans**: Run `npm run security-scan` regularly

## When to Seek Help

Contact support when:
- Security breaches are suspected
- Data corruption occurs
- Multiple systems are affected
- Recovery procedures fail

Always include diagnostic information when reporting issues (see [diagnostics.md](diagnostics.md)).

## 🔗 Related Documentation
- [🔧 Diagnostics](diagnostics.md) - Diagnostic tools and procedures
- [🔄 Recovery](recovery.md) - Backup and disaster recovery
- [🛡️ Security Monitoring](../security/monitoring.md) - Security troubleshooting
- [⚙️ Configuration Guides](../configuration/README.md) - Configuration troubleshooting
- [🔌 API Documentation](../api/README.md) - API troubleshooting

## ⚡ Quick Links
- [🏠 Home](../../../README.md)
- [📚 Documentation](../../README.md)
- [❓ Troubleshooting Overview](README.md)
- [📖 First Time Setup](../../../FIRST_TIME.md)

---
**Previous**: [Troubleshooting Overview](README.md) | **Next**: [Diagnostics](diagnostics.md) | **Up**: [Troubleshooting Guides](README.md)