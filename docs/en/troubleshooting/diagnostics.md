# System Diagnostics

This guide provides tools and procedures for diagnosing system issues.

## Quick Diagnostic Commands

### System Health Check

```bash
# Run comprehensive system test
npm test

# Check all service status
npm run status

# View real-time logs
tail -f logs/application-$(date +%Y-%m-%d).log
tail -f logs/error-$(date +%Y-%m-%d).log
tail -f logs/security-$(date +%Y-%m-%d).log
```

### System Information

```bash
# Operating system information
uname -a
cat /etc/os-release

# Node.js and npm versions
node --version
npm --version

# System resources
free -h          # Memory usage
df -h            # Disk usage
uptime           # System load
```

### Process Information

```bash
# Check running processes
ps aux | grep -E "(node|openvpn)"

# Check process tree
pstree -p

# Monitor system processes
top
htop  # if available
```

## Network Diagnostics

### Port and Connection Status

```bash
# Check listening ports
netstat -tlnp | grep -E "(1194|3000)"
ss -tlnp | grep -E "(1194|3000)"

# Check all network connections
netstat -an
ss -an

# Check specific port availability
lsof -i :3000
lsof -i :1194
```

### Network Configuration

```bash
# Network interfaces
ip addr show
ifconfig  # on older systems

# Routing table
ip route
route -n

# Network statistics
ip -s link
cat /proc/net/dev
```

### Connectivity Testing

```bash
# Basic connectivity
ping -c 4 8.8.8.8
ping -c 4 google.com

# DNS resolution
nslookup google.com
dig google.com
host google.com

# Trace network path
traceroute 8.8.8.8
mtr google.com  # if available
```

### VPN-Specific Network Checks

```bash
# Check TUN interface
ip addr show tun0
ip route | grep tun0

# Check VPN routing
ip route show table main
ip rule show

# Test VPN DNS
nslookup google.com 8.8.8.8
```

## Certificate Diagnostics

### PKI Status

```bash
# Check PKI directory structure
ls -la easy-rsa/pki/
tree easy-rsa/pki/  # if available

# Check certificate files
ls -la easy-rsa/pki/issued/
ls -la easy-rsa/pki/private/
```

### Certificate Information

```bash
# CA certificate details
openssl x509 -in easy-rsa/pki/ca.crt -text -noout

# Server certificate details
openssl x509 -in easy-rsa/pki/issued/server.crt -text -noout

# Client certificate details
openssl x509 -in test-certificates/test-client.crt -text -noout

# Check certificate expiration
openssl x509 -in easy-rsa/pki/ca.crt -checkend 86400 -noout
echo $?  # 0 = valid, 1 = expires within 24 hours
```

### Certificate Validation

```bash
# Verify certificate chain
openssl verify -CAfile easy-rsa/pki/ca.crt easy-rsa/pki/issued/server.crt
openssl verify -CAfile easy-rsa/pki/ca.crt test-certificates/test-client.crt

# Check key and certificate match
openssl x509 -noout -modulus -in easy-rsa/pki/issued/server.crt | openssl md5
openssl rsa -noout -modulus -in easy-rsa/pki/private/server.key | openssl md5

# Check CRL (Certificate Revocation List)
openssl crl -in easy-rsa/pki/crl.pem -text -noout
```

## Log Analysis

### Log File Locations

```bash
# Application logs
ls -la logs/
tail -f logs/application-$(date +%Y-%m-%d).log

# System logs (varies by OS)
# Ubuntu/Debian
tail -f /var/log/syslog
journalctl -f

# CentOS/RHEL
tail -f /var/log/messages
journalctl -f

# OpenVPN logs
tail -f /var/log/openvpn/server.log
```

### Log Analysis Commands

```bash
# Search for errors
grep -i error logs/*.log
grep -i failed logs/*.log
grep -i warning logs/*.log

# Search for specific patterns
grep "authentication" logs/security-*.log
grep "certificate" logs/application-*.log
grep "connection" logs/*.log

# Count error occurrences
grep -c "ERROR" logs/error-*.log
grep -c "FAILED" logs/security-*.log

# Show recent errors
tail -100 logs/error-$(date +%Y-%m-%d).log | grep -i error
```

### Security Log Analysis

```bash
# Check for failed authentication attempts
grep "AUTHENTICATION_FAILED" logs/security-*.log

# Check for certificate operations
grep "CERTIFICATE_" logs/security-*.log

# Check for suspicious activity
grep -E "(BREACH|ATTACK|INTRUSION)" logs/security-*.log

# Check login patterns
grep "LOGIN_" logs/security-*.log | tail -20
```

## Performance Diagnostics

### System Performance

```bash
# CPU usage
top -n 1 | head -20
cat /proc/loadavg

# Memory usage
free -m
cat /proc/meminfo

# Disk I/O
iostat 1 5  # if available
iotop       # if available

# Network I/O
iftop       # if available
nethogs     # if available
```

### Application Performance

```bash
# Node.js process information
ps aux | grep node
pmap $(pgrep node)  # memory map

# Check for memory leaks
node --inspect server.js
# Then connect with Chrome DevTools

# Monitor file descriptors
lsof -p $(pgrep node)
```

## Creating Diagnostic Reports

### Automated Diagnostic Report

```bash
#!/bin/bash
# Create comprehensive diagnostic report

REPORT_FILE="diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"

echo "=== Family VPN Server Diagnostic Report ===" > $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== System Information ===" >> $REPORT_FILE
uname -a >> $REPORT_FILE
cat /etc/os-release >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Software Versions ===" >> $REPORT_FILE
node --version >> $REPORT_FILE
npm --version >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== System Resources ===" >> $REPORT_FILE
free -h >> $REPORT_FILE
df -h >> $REPORT_FILE
uptime >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Process Status ===" >> $REPORT_FILE
ps aux | grep -E "(node|openvpn)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Network Status ===" >> $REPORT_FILE
netstat -tlnp | grep -E "(1194|3000)" >> $REPORT_FILE
ip addr show >> $REPORT_FILE
ip route >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Certificate Status ===" >> $REPORT_FILE
ls -la easy-rsa/pki/ >> $REPORT_FILE
openssl x509 -in easy-rsa/pki/ca.crt -subject -dates -noout >> $REPORT_FILE 2>/dev/null
echo "" >> $REPORT_FILE

echo "=== Recent Logs ===" >> $REPORT_FILE
echo "--- Application Log ---" >> $REPORT_FILE
tail -50 logs/application-$(date +%Y-%m-%d).log >> $REPORT_FILE 2>/dev/null
echo "--- Error Log ---" >> $REPORT_FILE
tail -50 logs/error-$(date +%Y-%m-%d).log >> $REPORT_FILE 2>/dev/null
echo "--- Security Log ---" >> $REPORT_FILE
tail -50 logs/security-$(date +%Y-%m-%d).log >> $REPORT_FILE 2>/dev/null
echo "" >> $REPORT_FILE

echo "=== Configuration (Sanitized) ===" >> $REPORT_FILE
cat .env | grep -v -E "(PASSWORD|SECRET|KEY)" >> $REPORT_FILE 2>/dev/null
echo "" >> $REPORT_FILE

echo "Diagnostic report created: $REPORT_FILE"
```

### Quick Health Check Script

```bash
#!/bin/bash
# Quick system health check

echo "🔍 Family VPN Server Health Check"
echo "================================="

# Check if server is running
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Node.js server is running"
else
    echo "❌ Node.js server is not running"
fi

# Check if OpenVPN is running
if pgrep openvpn > /dev/null; then
    echo "✅ OpenVPN server is running"
else
    echo "❌ OpenVPN server is not running"
fi

# Check web interface
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Web interface is accessible"
else
    echo "❌ Web interface is not accessible"
fi

# Check certificate files
if [ -f "easy-rsa/pki/ca.crt" ]; then
    echo "✅ CA certificate exists"
else
    echo "❌ CA certificate missing"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 90 ]; then
    echo "✅ Disk space OK ($DISK_USAGE% used)"
else
    echo "⚠️  Disk space low ($DISK_USAGE% used)"
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -lt 90 ]; then
    echo "✅ Memory usage OK ($MEM_USAGE% used)"
else
    echo "⚠️  Memory usage high ($MEM_USAGE% used)"
fi

echo ""
echo "Run 'npm test' for detailed diagnostics"
```

## Remote Diagnostics

### SSH Diagnostics

```bash
# Connect and run diagnostics remotely
ssh user@vpn-server "cd /path/to/vpn && npm test"

# Copy logs for analysis
scp user@vpn-server:/path/to/vpn/logs/*.log ./remote-logs/

# Run remote health check
ssh user@vpn-server "cd /path/to/vpn && ./health-check.sh"
```

### Docker Diagnostics

```bash
# Check container status
docker ps
docker stats

# View container logs
docker logs family-vpn-server
docker logs -f family-vpn-server

# Execute commands in container
docker exec -it family-vpn-server bash
docker exec family-vpn-server npm test

# Check container resources
docker exec family-vpn-server df -h
docker exec family-vpn-server free -h
```

## Troubleshooting Checklist

When diagnosing issues, follow this systematic approach:

### Initial Assessment
- [ ] Run `npm test` for overall health check
- [ ] Check recent logs for error messages
- [ ] Verify all required processes are running
- [ ] Check system resources (CPU, memory, disk)

### Network Issues
- [ ] Test basic connectivity (ping, DNS)
- [ ] Check port availability and firewall rules
- [ ] Verify network interface configuration
- [ ] Test VPN-specific networking

### Certificate Issues
- [ ] Check PKI directory structure and permissions
- [ ] Verify certificate validity and expiration
- [ ] Test certificate chain validation
- [ ] Check for certificate/key mismatches

### Performance Issues
- [ ] Monitor system resources during operation
- [ ] Check for memory leaks or high CPU usage
- [ ] Analyze network throughput and latency
- [ ] Review log files for performance warnings

### Security Issues
- [ ] Check security logs for suspicious activity
- [ ] Verify authentication configuration
- [ ] Check file permissions and ownership
- [ ] Review recent configuration changes

Remember to document your findings and create diagnostic reports when seeking help or escalating issues.