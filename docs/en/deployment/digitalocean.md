# DigitalOcean Deployment Guide

This guide covers deploying the Family VPN Server on DigitalOcean Droplets with proper networking, security, and best practices.

## Prerequisites

- DigitalOcean account with billing enabled
- DigitalOcean CLI (doctl) installed and configured
- Basic understanding of DigitalOcean networking concepts
- SSH key pair for Droplet access

## Quick Start

### 1. Setup DigitalOcean Environment

```bash
# Install doctl (DigitalOcean CLI)
# macOS
brew install doctl

# Linux
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.92.0/doctl-1.92.0-linux-amd64.tar.gz
tar xf doctl-1.92.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin

# Authenticate with DigitalOcean
doctl auth init

# List available regions and sizes
doctl compute region list
doctl compute size list
```

### 2. Create SSH Key

```bash
# Upload SSH key to DigitalOcean
doctl compute ssh-key create family-vpn-key \
  --public-key-file ~/.ssh/id_rsa.pub

# Get SSH key ID
doctl compute ssh-key list
```

### 3. Create Droplet

#### Using doctl CLI

```bash
# Create Droplet
doctl compute droplet create family-vpn-server \
  --region nyc3 \
  --image ubuntu-20-04-x64 \
  --size s-2vcpu-2gb \
  --ssh-keys your-ssh-key-id \
  --enable-monitoring \
  --enable-ipv6 \
  --tag-names vpn-server,production

# Get Droplet IP address
doctl compute droplet list family-vpn-server
```

#### Using DigitalOcean Control Panel

1. **Navigate to Droplets**
   - Go to DigitalOcean Control Panel → Droplets
   - Click "Create Droplet"

2. **Choose Configuration**
   - **Image**: Ubuntu 20.04 (LTS) x64
   - **Plan**: Basic - $12/month (2 vCPU, 2GB RAM, 50GB SSD)
   - **Region**: New York 3 (or closest to your users)
   - **Authentication**: SSH keys (select your uploaded key)

3. **Additional Options**
   - **Monitoring**: Enable
   - **IPv6**: Enable
   - **Tags**: vpn-server, production

### 4. Connect and Setup Droplet

```bash
# Get Droplet IP
DROPLET_IP=$(doctl compute droplet list family-vpn-server --format PublicIPv4 --no-header)

# Connect to Droplet
ssh root@$DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install OpenVPN and dependencies
apt install -y openvpn easy-rsa git curl ufw

# Clone application
git clone <repository-url>
cd family-vpn-server

# Install dependencies
npm install
```

### 5. Configure Environment

```bash
# Create environment configuration
cp .env.example .env

# Update .env with DigitalOcean-specific settings
cat > .env <<EOF
# Network Configuration
VPN_HOST=$DROPLET_IP
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Ports
VPN_PORT=1194
API_PORT=3000

# Production Settings
NODE_ENV=production
WEB_HTTPS_ONLY=true

# Security
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=your-bcrypt-hash
WEB_RATE_LIMIT_ENABLED=true
WEB_SESSION_TIMEOUT=1800000

# Paths
VPN_CONFIG_DIR=/etc/openvpn
VPN_CERT_DIR=/etc/openvpn/certificates
EOF
```

### 6. Initialize and Deploy

```bash
# Run setup wizard
npm run setup

# Initialize PKI
npm run init-pki

# Create admin credentials
npm run setup-auth

# Apply security hardening
npm run harden-config

# Start server
npm start
```

## Production Deployment

### 1. Firewall Configuration

```bash
# Configure UFW (Uncomplicated Firewall)
ufw --force enable

# Allow SSH
ufw allow ssh

# Allow OpenVPN
ufw allow 1194/udp

# Allow HTTPS for web interface
ufw allow 443/tcp

# Allow HTTP for Let's Encrypt (temporary)
ufw allow 80/tcp

# Check firewall status
ufw status verbose
```

### 2. SSL Certificate Setup

#### Using Let's Encrypt

```bash
# Install certbot
apt install certbot

# Stop any running web server
systemctl stop family-vpn

# Generate certificate (replace with your domain)
certbot certonly --standalone -d your-domain.com

# Update .env with SSL paths
echo "SSL_CERT=/etc/letsencrypt/live/your-domain.com/fullchain.pem" >> .env
echo "SSL_KEY=/etc/letsencrypt/live/your-domain.com/privkey.pem" >> .env

# Set up automatic renewal
echo "0 3 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### 3. Systemd Service Configuration

```bash
# Create systemd service
tee /etc/systemd/system/family-vpn.service > /dev/null <<EOF
[Unit]
Description=Family VPN Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/family-vpn-server
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/root/family-vpn-server

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl enable family-vpn
systemctl start family-vpn
systemctl status family-vpn
```

## DigitalOcean-Specific Features

### 1. Reserved IP (Floating IP)

```bash
# Create reserved IP
doctl compute floating-ip create --region nyc3

# Assign to Droplet
doctl compute floating-ip-action assign <floating-ip> <droplet-id>

# Update DNS and environment
echo "VPN_HOST=your-floating-ip" >> .env
```

### 2. Block Storage (Volumes)

```bash
# Create volume for backups
doctl compute volume create vpn-backups \
  --region nyc3 \
  --size 10GiB \
  --fs-type ext4

# Attach volume to Droplet
doctl compute volume-action attach vpn-backups <droplet-id>

# Mount volume
mkdir -p /mnt/vpn-backups
mount /dev/disk/by-id/scsi-0DO_Volume_vpn-backups /mnt/vpn-backups

# Add to fstab for persistent mounting
echo '/dev/disk/by-id/scsi-0DO_Volume_vpn-backups /mnt/vpn-backups ext4 defaults,nofail,discard 0 2' >> /etc/fstab
```

### 3. Monitoring and Alerting

```bash
# Install DigitalOcean monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | bash

# Configure monitoring
tee /etc/do-agent/config.yaml > /dev/null <<EOF
api_key: your-do-api-key
tags:
  - vpn-server
  - production
enable_process_metrics: true
enable_network_metrics: true
EOF

# Restart monitoring agent
systemctl restart do-agent
```

### 4. Snapshots and Backups

```bash
# Enable automatic backups
doctl compute droplet-action enable-backups <droplet-id>

# Create manual snapshot
doctl compute droplet-action snapshot <droplet-id> \
  --snapshot-name "family-vpn-$(date +%Y%m%d-%H%M%S)"

# Automated snapshot script
cat > /root/create-snapshot.sh <<EOF
#!/bin/bash
DROPLET_ID=\$(curl -s http://169.254.169.254/metadata/v1/id)
DATE=\$(date +%Y%m%d-%H%M%S)

doctl compute droplet-action snapshot \$DROPLET_ID \
  --snapshot-name "family-vpn-auto-\$DATE"

# Keep only last 7 snapshots
doctl compute snapshot list --format ID,Name,Created \
  | grep "family-vpn-auto-" \
  | sort -k3 \
  | head -n -7 \
  | awk '{print \$1}' \
  | xargs -r doctl compute snapshot delete --force
EOF

chmod +x /root/create-snapshot.sh

# Schedule daily snapshots
echo "0 2 * * * /root/create-snapshot.sh" | crontab -
```

## High Availability Setup

### 1. Load Balancer

```bash
# Create load balancer
doctl compute load-balancer create \
  --name family-vpn-lb \
  --algorithm round_robin \
  --region nyc3 \
  --tag-name vpn-server \
  --health-check protocol:http,port:3000,path:/health,check_interval_seconds:10,response_timeout_seconds:5,healthy_threshold:3,unhealthy_threshold:3 \
  --forwarding-rules entry_protocol:https,entry_port:443,target_protocol:http,target_port:3000,certificate_id:your-cert-id \
  --forwarding-rules entry_protocol:udp,entry_port:1194,target_protocol:udp,target_port:1194
```

### 2. Multiple Droplets

```bash
# Create multiple Droplets in different regions
doctl compute droplet create family-vpn-server-nyc \
  --region nyc3 \
  --image ubuntu-20-04-x64 \
  --size s-2vcpu-2gb \
  --ssh-keys your-ssh-key-id \
  --tag-names vpn-server,nyc

doctl compute droplet create family-vpn-server-sfo \
  --region sfo3 \
  --image ubuntu-20-04-x64 \
  --size s-2vcpu-2gb \
  --ssh-keys your-ssh-key-id \
  --tag-names vpn-server,sfo
```

## Backup and Recovery

### 1. Spaces (Object Storage) Backup

```bash
# Create Spaces bucket
doctl compute cdn create --origin your-space-name.nyc3.digitaloceanspaces.com

# Install s3cmd for Spaces access
apt install s3cmd

# Configure s3cmd for DigitalOcean Spaces
s3cmd --configure

# Create backup script
cat > /root/backup-spaces.sh <<EOF
#!/bin/bash
SPACE_NAME="your-space-name"
DATE=\$(date +%Y%m%d_%H%M%S)

# Backup certificates and configuration
tar -czf /tmp/vpn-backup-\$DATE.tar.gz \
  /root/family-vpn-server/certificates \
  /root/family-vpn-server/easy-rsa/pki \
  /root/family-vpn-server/.env \
  /root/family-vpn-server/logs

# Upload to Spaces
s3cmd put /tmp/vpn-backup-\$DATE.tar.gz s3://\$SPACE_NAME/backups/

# Clean up local backup
rm /tmp/vpn-backup-\$DATE.tar.gz

# Keep only last 30 backups in Spaces
s3cmd ls s3://\$SPACE_NAME/backups/ | sort | head -n -30 | awk '{print \$4}' | \
  xargs -r s3cmd del
EOF

chmod +x /root/backup-spaces.sh

# Schedule daily backups
echo "0 3 * * * /root/backup-spaces.sh" | crontab -
```

### 2. Volume Backup

```bash
# Create backup to attached volume
cat > /root/backup-volume.sh <<EOF
#!/bin/bash
BACKUP_DIR="/mnt/vpn-backups"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Backup certificates and configuration
tar -czf \$BACKUP_DIR/vpn-backup-\$DATE.tar.gz \
  /root/family-vpn-server/certificates \
  /root/family-vpn-server/easy-rsa/pki \
  /root/family-vpn-server/.env \
  /root/family-vpn-server/logs

# Keep only last 14 backups
find \$BACKUP_DIR -name "vpn-backup-*.tar.gz" -mtime +14 -delete

echo "Backup completed: \$BACKUP_DIR/vpn-backup-\$DATE.tar.gz"
EOF

chmod +x /root/backup-volume.sh

# Schedule daily volume backups
echo "0 1 * * * /root/backup-volume.sh" | crontab -
```

## Security Best Practices

### 1. SSH Hardening

```bash
# Configure SSH security
tee -a /etc/ssh/sshd_config > /dev/null <<EOF
# Security hardening
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# Restart SSH service
systemctl restart sshd
```

### 2. Fail2Ban

```bash
# Install and configure Fail2Ban
apt install fail2ban

# Configure Fail2Ban for SSH and VPN
tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /root/family-vpn-server/logs/error.log
EOF

# Start Fail2Ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 3. Automatic Security Updates

```bash
# Install unattended-upgrades
apt install unattended-upgrades

# Configure automatic security updates
dpkg-reconfigure -plow unattended-upgrades

# Configure update settings
tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
```

## Cost Optimization

### 1. Droplet Sizing

```bash
# Monitor resource usage
htop
iotop
nethogs

# Resize Droplet if needed
doctl compute droplet-action resize <droplet-id> --size s-1vcpu-1gb --resize-disk
```

### 2. Reserved IPs Management

```bash
# List floating IPs
doctl compute floating-ip list

# Unassign unused floating IPs to avoid charges
doctl compute floating-ip-action unassign <floating-ip>

# Delete unused floating IPs
doctl compute floating-ip delete <floating-ip>
```

### 3. Snapshot Management

```bash
# List snapshots
doctl compute snapshot list

# Delete old snapshots
doctl compute snapshot delete <snapshot-id>

# Automated cleanup script
cat > /root/cleanup-snapshots.sh <<EOF
#!/bin/bash
# Keep only last 5 snapshots
doctl compute snapshot list --format ID,Name,Created \
  | grep "family-vpn-" \
  | sort -k3 \
  | head -n -5 \
  | awk '{print \$1}' \
  | xargs -r doctl compute snapshot delete --force
EOF

chmod +x /root/cleanup-snapshots.sh
echo "0 4 * * 0 /root/cleanup-snapshots.sh" | crontab -
```

## Monitoring and Performance

### 1. System Monitoring

```bash
# Install monitoring tools
apt install htop iotop nethogs vnstat

# Configure vnstat for network monitoring
vnstat -u -i eth0
systemctl enable vnstat
systemctl start vnstat

# Create monitoring script
cat > /root/monitor-system.sh <<EOF
#!/bin/bash
echo "=== System Status $(date) ===" >> /var/log/system-monitor.log
echo "CPU Usage:" >> /var/log/system-monitor.log
top -bn1 | grep "Cpu(s)" >> /var/log/system-monitor.log
echo "Memory Usage:" >> /var/log/system-monitor.log
free -h >> /var/log/system-monitor.log
echo "Disk Usage:" >> /var/log/system-monitor.log
df -h >> /var/log/system-monitor.log
echo "VPN Connections:" >> /var/log/system-monitor.log
netstat -tulpn | grep :1194 >> /var/log/system-monitor.log
echo "=========================" >> /var/log/system-monitor.log
EOF

chmod +x /root/monitor-system.sh
echo "*/15 * * * * /root/monitor-system.sh" | crontab -
```

### 2. Application Monitoring

```bash
# Create VPN-specific monitoring
cat > /root/monitor-vpn.sh <<EOF
#!/bin/bash
LOG_FILE="/var/log/vpn-monitor.log"
DATE=\$(date)

echo "=== VPN Monitor \$DATE ===" >> \$LOG_FILE

# Check service status
systemctl is-active family-vpn >> \$LOG_FILE

# Check web interface
curl -s -o /dev/null -w "Web Interface: %{http_code}\n" http://localhost:3000/health >> \$LOG_FILE

# Check OpenVPN process
pgrep openvpn > /dev/null && echo "OpenVPN: Running" >> \$LOG_FILE || echo "OpenVPN: Not Running" >> \$LOG_FILE

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -noout -dates >> \$LOG_FILE 2>/dev/null

echo "=========================" >> \$LOG_FILE
EOF

chmod +x /root/monitor-vpn.sh
echo "*/5 * * * * /root/monitor-vpn.sh" | crontab -
```

## Troubleshooting

### Common DigitalOcean Issues

#### Metadata Service

```bash
# Test DigitalOcean metadata service
curl -s http://169.254.169.254/metadata/v1/id
curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address
```

#### Network Connectivity

```bash
# Test external connectivity
ping -c 4 8.8.8.8

# Check firewall rules
ufw status verbose

# Test VPN port
nc -u -l 1194 &
nc -u localhost 1194
```

#### Droplet Performance

```bash
# Check I/O performance
iostat -x 1

# Test disk speed
dd if=/dev/zero of=/tmp/test bs=1M count=1000 oflag=direct

# Check network performance
iperf3 -s &  # On server
iperf3 -c server-ip  # On client
```

#### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Test certificate renewal
certbot renew --dry-run

# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout
```

### Log Analysis

```bash
# Check system logs
journalctl -u family-vpn -f

# Check OpenVPN logs
tail -f /var/log/openvpn/openvpn.log

# Check authentication logs
tail -f /var/log/auth.log

# Check application logs
tail -f /root/family-vpn-server/logs/application.log
```

## Performance Optimization

### 1. Network Optimization

```bash
# Optimize network parameters
tee -a /etc/sysctl.conf > /dev/null <<EOF
# Network optimizations for VPN
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.ip_forward = 1
net.ipv4.tcp_congestion_control = bbr
EOF

sysctl -p
```

### 2. OpenVPN Optimization

```bash
# Add performance settings to OpenVPN config
tee -a /etc/openvpn/server.conf > /dev/null <<EOF
# Performance optimizations
sndbuf 0
rcvbuf 0
fast-io
comp-lzo adaptive
push "comp-lzo adaptive"
EOF

systemctl restart openvpn@server
```

## Related Documentation

- [Production Best Practices](production.md) - Security and monitoring
- [Docker Deployment](docker.md) - Alternative containerized deployment
- [Configuration Guide](../configuration/README.md) - Environment configuration
- [Security Guide](../security/README.md) - Security hardening