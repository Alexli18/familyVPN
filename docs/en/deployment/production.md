# Production Best Practices

This guide covers deploying the Family VPN Server to production with proper security, monitoring, and maintenance practices.

## Quick Production Deployment

### Automated Deployment Script

```bash
# Deploy to production (run as root for SSL setup)
sudo ./scripts/deploy-production.sh your-domain.com your-server-ip

# Or deploy without SSL (manual SSL setup required)
./scripts/deploy-production.sh your-domain.com your-server-ip
```

### Manual Production Steps

```bash
# 1. Update production configuration
cp .env.production.example .env.production
nano .env.production  # Update VPN_HOST and other settings

# 2. Set up SSL certificates
sudo certbot certonly --standalone -d your-domain.com

# 3. Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Verify deployment
./scripts/monitor-production.sh
```

## Production Configuration

### Environment Variables (.env.production)

```bash
# Required Settings
VPN_HOST=your-domain.com              # Your server's domain/IP
WEB_ADMIN_USERNAME=admin              # Web interface username
WEB_ADMIN_PASSWORD_HASH=...           # Bcrypt hash of admin password

# Security Settings
WEB_HTTPS_ONLY=true                   # Enforce HTTPS
WEB_RATE_LIMIT_ENABLED=true          # Enable rate limiting
WEB_SESSION_SECRET=...                # Secure session secret (64+ chars)
WEB_SESSION_TIMEOUT=1800000           # Session timeout (30 minutes)

# VPN Network Configuration
VPN_SUBNET=10.8.0.0                   # VPN subnet
VPN_NETMASK=255.255.255.0             # VPN netmask

# SSL Configuration
SSL_CERT=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY=/etc/letsencrypt/live/your-domain.com/privkey.pem

# Logging
LOG_LEVEL=info                        # Production log level
LOG_MAX_SIZE=10m                      # Maximum log file size
LOG_MAX_FILES=5                       # Number of log files to keep
```

### Docker Production Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  vpn-server:
    build: .
    container_name: family-vpn-server-prod
    cap_add:
      - NET_ADMIN
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    devices:
      - /dev/net/tun
    ports:
      - "443:3000"
      - "1194:1194/udp"
    volumes:
      - vpn-certificates:/app/certificates
      - vpn-logs:/app/logs
      - vpn-config:/app/config
      - /etc/letsencrypt:/etc/letsencrypt:ro
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "https://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  vpn-certificates:
    driver: local
  vpn-logs:
    driver: local
  vpn-config:
    driver: local
```

## Security Features

### Web Interface Security

- **HTTPS Enforcement**: All traffic encrypted with SSL/TLS
- **Authentication**: Bcrypt password hashing with configurable complexity
- **Session Security**: Secure cookies with HttpOnly and Secure flags
- **Rate Limiting**: Configurable brute force protection
- **CSRF Protection**: Cross-site request forgery prevention
- **XSS Protection**: Input validation and output escaping
- **Security Headers**: HSTS, X-Frame-Options, X-Content-Type-Options

### Container Security

- **Minimal Privileges**: Runs with only required capabilities (NET_ADMIN)
- **Security Capabilities**: All unnecessary capabilities dropped
- **Read-only Mounts**: SSL certificates mounted read-only
- **Tmpfs**: Temporary files stored in memory
- **Health Monitoring**: Automatic restart on failure
- **No New Privileges**: Prevents privilege escalation

### VPN Security

- **PKI Infrastructure**: Full certificate authority with Easy-RSA
- **Certificate Revocation**: CRL support for compromised certificates
- **Network Isolation**: Dedicated VPN subnet with proper routing
- **Encryption**: Strong cipher suites and key exchange algorithms
- **Logging**: Comprehensive audit trail for all connections

## SSL/TLS Configuration

### Let's Encrypt Setup

```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Verify certificate
sudo certbot certificates

# Test automatic renewal
sudo certbot renew --dry-run

# Set up automatic renewal
echo "0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook 'docker-compose -f /path/to/docker-compose.prod.yml restart vpn-server'" | sudo crontab -
```

### Custom SSL Certificates

```bash
# For custom certificates, update .env.production
SSL_CERT=/path/to/your/certificate.crt
SSL_KEY=/path/to/your/private.key

# Ensure proper permissions
sudo chown root:root /path/to/your/certificate.crt
sudo chown root:root /path/to/your/private.key
sudo chmod 644 /path/to/your/certificate.crt
sudo chmod 600 /path/to/your/private.key
```

### SSL Security Configuration

```bash
# Strong SSL configuration in .env.production
SSL_PROTOCOLS=TLSv1.2,TLSv1.3
SSL_CIPHERS=ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
SSL_PREFER_SERVER_CIPHERS=true
SSL_SESSION_CACHE=shared:SSL:10m
SSL_SESSION_TIMEOUT=10m
```

## Firewall Configuration

### UFW (Ubuntu/Debian)

```bash
# Reset firewall rules
sudo ufw --force reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port as needed)
sudo ufw allow 22/tcp

# Allow HTTPS for web interface
sudo ufw allow 443/tcp

# Allow VPN traffic
sudo ufw allow 1194/udp

# Allow HTTP for Let's Encrypt (optional)
sudo ufw allow 80/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### iptables (Advanced)

```bash
# Create comprehensive iptables rules
cat > /etc/iptables/rules.v4 <<EOF
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]

# Allow loopback
-A INPUT -i lo -j ACCEPT

# Allow established connections
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
-A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTPS
-A INPUT -p tcp --dport 443 -j ACCEPT

# Allow VPN
-A INPUT -p udp --dport 1194 -j ACCEPT

# Allow HTTP for Let's Encrypt
-A INPUT -p tcp --dport 80 -j ACCEPT

# Rate limiting for SSH
-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP

# Rate limiting for HTTPS
-A INPUT -p tcp --dport 443 -m state --state NEW -m recent --set
-A INPUT -p tcp --dport 443 -m state --state NEW -m recent --update --seconds 60 --hitcount 20 -j DROP

COMMIT
EOF

# Apply rules
iptables-restore < /etc/iptables/rules.v4
```

## Monitoring and Logging

### System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs vnstat

# Create system monitoring script
cat > /usr/local/bin/monitor-system.sh <<EOF
#!/bin/bash
LOG_FILE="/var/log/system-monitor.log"
DATE=\$(date)

echo "=== System Monitor \$DATE ===" >> \$LOG_FILE

# CPU and Memory
echo "CPU Usage:" >> \$LOG_FILE
top -bn1 | grep "Cpu(s)" >> \$LOG_FILE
echo "Memory Usage:" >> \$LOG_FILE
free -h >> \$LOG_FILE

# Disk Usage
echo "Disk Usage:" >> \$LOG_FILE
df -h >> \$LOG_FILE

# Network Connections
echo "VPN Connections:" >> \$LOG_FILE
netstat -tulpn | grep -E "(1194|3000)" >> \$LOG_FILE

# Docker Status
echo "Container Status:" >> \$LOG_FILE
docker-compose -f /path/to/docker-compose.prod.yml ps >> \$LOG_FILE

echo "=========================" >> \$LOG_FILE
EOF

chmod +x /usr/local/bin/monitor-system.sh

# Schedule monitoring
echo "*/5 * * * * /usr/local/bin/monitor-system.sh" | sudo crontab -
```

### Application Monitoring

```bash
# Create VPN-specific monitoring
cat > /usr/local/bin/monitor-vpn.sh <<EOF
#!/bin/bash
LOG_FILE="/var/log/vpn-monitor.log"
DATE=\$(date)

echo "=== VPN Monitor \$DATE ===" >> \$LOG_FILE

# Container health
docker-compose -f /path/to/docker-compose.prod.yml ps >> \$LOG_FILE

# Health endpoint
curl -s -o /dev/null -w "Health Check: %{http_code} (Response time: %{time_total}s)\n" \
  https://localhost:443/health >> \$LOG_FILE

# Certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -noout -dates >> \$LOG_FILE 2>/dev/null

# VPN client count
CLIENT_COUNT=\$(docker-compose -f /path/to/docker-compose.prod.yml exec -T vpn-server \
  netstat -an | grep :1194 | grep ESTABLISHED | wc -l)
echo "Active VPN Connections: \$CLIENT_COUNT" >> \$LOG_FILE

echo "=========================" >> \$LOG_FILE
EOF

chmod +x /usr/local/bin/monitor-vpn.sh

# Schedule VPN monitoring
echo "*/2 * * * * /usr/local/bin/monitor-vpn.sh" | sudo crontab -
```

### Log Management

```bash
# Configure logrotate for application logs
sudo tee /etc/logrotate.d/family-vpn > /dev/null <<EOF
/var/log/vpn-monitor.log
/var/log/system-monitor.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Configure Docker log rotation (already in docker-compose.prod.yml)
# Additional system-wide Docker log configuration
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

## Backup and Recovery

### Automated Backup Strategy

```bash
# Create comprehensive backup script
cat > /usr/local/bin/backup-production.sh <<EOF
#!/bin/bash
BACKUP_DIR="/backup/vpn"
DATE=\$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p \$BACKUP_DIR

echo "Starting backup at \$(date)"

# Stop services for consistent backup
docker-compose -f /path/to/docker-compose.prod.yml stop

# Backup Docker volumes
docker run --rm -v vpn-certificates:/data -v \$BACKUP_DIR:/backup alpine \
  tar czf /backup/certificates-\$DATE.tar.gz -C /data .

docker run --rm -v vpn-logs:/data -v \$BACKUP_DIR:/backup alpine \
  tar czf /backup/logs-\$DATE.tar.gz -C /data .

docker run --rm -v vpn-config:/data -v \$BACKUP_DIR:/backup alpine \
  tar czf /backup/config-\$DATE.tar.gz -C /data .

# Backup configuration files
cp .env.production \$BACKUP_DIR/env-\$DATE
cp docker-compose.prod.yml \$BACKUP_DIR/compose-\$DATE.yml

# Backup SSL certificates
tar czf \$BACKUP_DIR/ssl-\$DATE.tar.gz /etc/letsencrypt/

# Create backup manifest
cat > \$BACKUP_DIR/manifest-\$DATE.txt <<MANIFEST
Backup Date: \$(date)
Certificates: certificates-\$DATE.tar.gz
Logs: logs-\$DATE.tar.gz
Config: config-\$DATE.tar.gz
Environment: env-\$DATE
Docker Compose: compose-\$DATE.yml
SSL Certificates: ssl-\$DATE.tar.gz
MANIFEST

# Start services
docker-compose -f /path/to/docker-compose.prod.yml start

# Clean up old backups
find \$BACKUP_DIR -name "*-*.tar.gz" -mtime +\$RETENTION_DAYS -delete
find \$BACKUP_DIR -name "env-*" -mtime +\$RETENTION_DAYS -delete
find \$BACKUP_DIR -name "compose-*.yml" -mtime +\$RETENTION_DAYS -delete
find \$BACKUP_DIR -name "manifest-*.txt" -mtime +\$RETENTION_DAYS -delete

echo "Backup completed at \$(date)"
EOF

chmod +x /usr/local/bin/backup-production.sh

# Schedule daily backups
echo "0 2 * * * /usr/local/bin/backup-production.sh" | sudo crontab -
```

### Cloud Backup Integration

```bash
# AWS S3 backup
cat > /usr/local/bin/backup-s3.sh <<EOF
#!/bin/bash
BACKUP_DIR="/backup/vpn"
S3_BUCKET="your-vpn-backup-bucket"
DATE=\$(date +%Y%m%d_%H%M%S)

# Run local backup first
/usr/local/bin/backup-production.sh

# Sync to S3
aws s3 sync \$BACKUP_DIR s3://\$S3_BUCKET/vpn-backups/ --delete

echo "S3 backup completed at \$(date)"
EOF

chmod +x /usr/local/bin/backup-s3.sh
```

### Recovery Procedures

```bash
# Create recovery script
cat > /usr/local/bin/recover-production.sh <<EOF
#!/bin/bash
BACKUP_DIR="/backup/vpn"
RESTORE_DATE=\$1

if [ -z "\$RESTORE_DATE" ]; then
    echo "Usage: \$0 YYYYMMDD_HHMMSS"
    echo "Available backups:"
    ls -la \$BACKUP_DIR/manifest-*.txt
    exit 1
fi

echo "Restoring from backup: \$RESTORE_DATE"

# Stop services
docker-compose -f /path/to/docker-compose.prod.yml down

# Restore Docker volumes
docker run --rm -v vpn-certificates:/data -v \$BACKUP_DIR:/backup alpine \
  tar xzf /backup/certificates-\$RESTORE_DATE.tar.gz -C /data

docker run --rm -v vpn-logs:/data -v \$BACKUP_DIR:/backup alpine \
  tar xzf /backup/logs-\$RESTORE_DATE.tar.gz -C /data

docker run --rm -v vpn-config:/data -v \$BACKUP_DIR:/backup alpine \
  tar xzf /backup/config-\$RESTORE_DATE.tar.gz -C /data

# Restore configuration
cp \$BACKUP_DIR/env-\$RESTORE_DATE .env.production
cp \$BACKUP_DIR/compose-\$RESTORE_DATE.yml docker-compose.prod.yml

# Restore SSL certificates
tar xzf \$BACKUP_DIR/ssl-\$RESTORE_DATE.tar.gz -C /

# Start services
docker-compose -f docker-compose.prod.yml up -d

echo "Recovery completed. Check service status:"
docker-compose -f docker-compose.prod.yml ps
EOF

chmod +x /usr/local/bin/recover-production.sh
```

## Performance Optimization

### System Tuning

```bash
# Optimize system parameters for VPN performance
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# VPN performance optimizations
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.ip_forward = 1
net.ipv4.tcp_congestion_control = bbr
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_window_scaling = 1
EOF

sudo sysctl -p
```

### Docker Performance

```bash
# Optimize Docker daemon configuration
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

sudo systemctl restart docker
```

### OpenVPN Performance

```bash
# Add performance optimizations to OpenVPN config
# These are applied automatically by the application, but can be customized
cat >> .env.production <<EOF
# OpenVPN performance settings
OPENVPN_SNDBUF=0
OPENVPN_RCVBUF=0
OPENVPN_FAST_IO=true
OPENVPN_COMP_LZO=adaptive
EOF
```

## Health Checks and Alerting

### Health Check Endpoints

```bash
# Test health endpoints
curl -k https://your-domain.com/health
curl -k https://your-domain.com/status

# Automated health check script
cat > /usr/local/bin/health-check.sh <<EOF
#!/bin/bash
HEALTH_URL="https://your-domain.com/health"
ALERT_EMAIL="admin@your-domain.com"

# Check health endpoint
HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" \$HEALTH_URL)

if [ "\$HTTP_CODE" != "200" ]; then
    echo "Health check failed with HTTP code: \$HTTP_CODE" | \
    mail -s "VPN Server Health Check Failed" \$ALERT_EMAIL
fi

# Check VPN process
if ! pgrep -f openvpn > /dev/null; then
    echo "OpenVPN process not running" | \
    mail -s "VPN Server Process Down" \$ALERT_EMAIL
fi

# Check certificate expiration (30 days warning)
CERT_FILE="/etc/letsencrypt/live/your-domain.com/cert.pem"
if [ -f "\$CERT_FILE" ]; then
    EXPIRY_DATE=\$(openssl x509 -in \$CERT_FILE -noout -enddate | cut -d= -f2)
    EXPIRY_EPOCH=\$(date -d "\$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=\$(date +%s)
    DAYS_UNTIL_EXPIRY=\$(( (\$EXPIRY_EPOCH - \$CURRENT_EPOCH) / 86400 ))
    
    if [ \$DAYS_UNTIL_EXPIRY -lt 30 ]; then
        echo "SSL certificate expires in \$DAYS_UNTIL_EXPIRY days" | \
        mail -s "VPN Server Certificate Expiring Soon" \$ALERT_EMAIL
    fi
fi
EOF

chmod +x /usr/local/bin/health-check.sh

# Schedule health checks every 5 minutes
echo "*/5 * * * * /usr/local/bin/health-check.sh" | sudo crontab -
```

## Troubleshooting

### Common Production Issues

#### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs vpn-server

# Check system resources
df -h
free -h
docker system df

# Verify configuration
docker-compose -f docker-compose.prod.yml config

# Check for port conflicts
sudo netstat -tulpn | grep -E "(443|1194)"
```

#### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Test certificate renewal
sudo certbot renew --dry-run

# Manual certificate generation
sudo certbot certonly --standalone -d your-domain.com

# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout
```

#### VPN Connection Issues

```bash
# Check OpenVPN process
docker-compose -f docker-compose.prod.yml exec vpn-server pgrep openvpn

# Check VPN logs
docker-compose -f docker-compose.prod.yml exec vpn-server cat /var/log/openvpn/openvpn.log

# Test network connectivity
docker-compose -f docker-compose.prod.yml exec vpn-server ping 8.8.8.8

# Check firewall rules
sudo ufw status verbose
```

#### Performance Issues

```bash
# Monitor resource usage
htop
iotop
nethogs

# Check container resources
docker stats family-vpn-server-prod

# Analyze network performance
iperf3 -s &  # On server
iperf3 -c your-server-ip  # On client
```

## Security Checklist

### Initial Setup

- [ ] Change default admin password
- [ ] Configure strong SSL certificates
- [ ] Set up firewall rules
- [ ] Enable automatic security updates
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting
- [ ] Create backup procedures

### Regular Maintenance

- [ ] Monitor security logs weekly
- [ ] Update container images monthly
- [ ] Renew SSL certificates (automated)
- [ ] Review and rotate admin credentials quarterly
- [ ] Test backup and recovery procedures monthly
- [ ] Review VPN user access quarterly
- [ ] Update system packages regularly

### Security Monitoring

- [ ] Failed login attempts
- [ ] Certificate generation requests
- [ ] Unusual VPN connection patterns
- [ ] System resource usage anomalies
- [ ] Container health status
- [ ] SSL certificate expiration warnings

## Support and Maintenance

### Log Locations

- **Container Logs**: `docker-compose -f docker-compose.prod.yml logs`
- **VPN Logs**: Inside container at `/var/log/openvpn/`
- **Web Logs**: Application logs via Winston
- **System Logs**: `/var/log/syslog`, `/var/log/auth.log`
- **Monitoring Logs**: `/var/log/vpn-monitor.log`, `/var/log/system-monitor.log`

### Configuration Files

- **Production Config**: `.env.production`
- **Docker Config**: `docker-compose.prod.yml`
- **VPN Config**: Generated in container `/app/config/`
- **Certificates**: Persistent volume `vpn-certificates`
- **SSL Certificates**: `/etc/letsencrypt/`

### Maintenance Scripts

- **Backup**: `/usr/local/bin/backup-production.sh`
- **Recovery**: `/usr/local/bin/recover-production.sh`
- **Monitoring**: `/usr/local/bin/monitor-vpn.sh`
- **Health Check**: `/usr/local/bin/health-check.sh`

For additional support, check the main [README](../../README.md) and project documentation.

## Related Documentation

- [Docker Deployment](docker.md) - Containerized deployment guide
- [Security Guide](../security/README.md) - Comprehensive security documentation
- [Configuration Guide](../configuration/README.md) - Environment configuration
- [Troubleshooting](../troubleshooting/README.md) - Common issues and solutions