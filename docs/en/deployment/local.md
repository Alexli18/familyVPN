# Local Deployment Guide

This guide covers deploying the Family VPN Server directly on your local system without Docker containerization.

## Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+, CentOS 8+, macOS 10.15+, or Windows 10+
- **CPU**: 1 core minimum, 2 cores recommended
- **RAM**: 1GB minimum, 2GB recommended
- **Disk**: 10GB available space
- **Network**: Administrative privileges for network configuration

### Software Dependencies
- Node.js 12.0.0 or higher
- npm 6.0.0 or higher
- OpenVPN 2.4 or higher
- Easy-RSA 3.0 or higher
- Git

## Installation Steps

### 1. Install System Dependencies

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install OpenVPN and Easy-RSA
sudo apt install -y openvpn easy-rsa

# Install additional tools
sudo apt install -y git curl wget
```

#### CentOS/RHEL/Fedora
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Install OpenVPN and Easy-RSA
sudo dnf install -y openvpn easy-rsa

# Install additional tools
sudo dnf install -y git curl wget
```

#### macOS
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node openvpn easy-rsa git
```

#### Windows
```powershell
# Install using Chocolatey (run as Administrator)
choco install nodejs openvpn git

# Or download and install manually:
# - Node.js: https://nodejs.org/
# - OpenVPN: https://openvpn.net/community-downloads/
# - Git: https://git-scm.com/download/win
```

### 2. Clone and Setup Application

```bash
# Clone repository
git clone <repository-url>
cd family-vpn-server

# Install Node.js dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` file with your local settings:

```env
# Network Configuration
VPN_HOST=127.0.0.1                    # Use your public IP for remote access
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Ports
VPN_PORT=1194
API_PORT=3000

# Paths (adjust for your system)
VPN_CONFIG_DIR=/etc/openvpn           # Linux/macOS
VPN_CERT_DIR=/etc/openvpn/certificates

# For user-local installation (no sudo required)
# VPN_CONFIG_DIR=~/.privatevpn/config
# VPN_CERT_DIR=~/.privatevpn/certificates

# Security
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=your-bcrypt-hash
```

### 4. Initialize PKI and Certificates

```bash
# Run interactive setup wizard
npm run setup

# Initialize PKI infrastructure
npm run init-pki

# Create admin credentials
npm run setup-auth

# Apply security hardening
npm run harden-config
```

### 5. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## System Service Configuration

### Linux (systemd)

Create a systemd service for automatic startup:

```bash
# Create service file
sudo tee /etc/systemd/system/family-vpn.service > /dev/null <<EOF
[Unit]
Description=Family VPN Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable family-vpn
sudo systemctl start family-vpn
sudo systemctl status family-vpn
```

### macOS (launchd)

Create a launch daemon:

```bash
# Create plist file
sudo tee /Library/LaunchDaemons/com.familyvpn.server.plist > /dev/null <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.familyvpn.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$(pwd)/src/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Load and start service
sudo launchctl load /Library/LaunchDaemons/com.familyvpn.server.plist
sudo launchctl start com.familyvpn.server
```

### Windows (NSSM)

Install NSSM (Non-Sucking Service Manager):

```powershell
# Install NSSM
choco install nssm

# Create service
nssm install FamilyVPN "C:\Program Files\nodejs\node.exe"
nssm set FamilyVPN AppParameters "src\server.js"
nssm set FamilyVPN AppDirectory "C:\path\to\family-vpn-server"
nssm set FamilyVPN DisplayName "Family VPN Server"
nssm set FamilyVPN Description "Family VPN Server with OpenVPN"

# Start service
nssm start FamilyVPN
```

## Network Configuration

### Firewall Rules

#### Linux (UFW)
```bash
# Allow SSH
sudo ufw allow ssh

# Allow VPN traffic
sudo ufw allow 1194/udp

# Allow web interface
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
```

#### Linux (iptables)
```bash
# Allow established connections
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow VPN
sudo iptables -A INPUT -p udp --dport 1194 -j ACCEPT

# Allow web interface
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

#### macOS
```bash
# Add firewall rules using pfctl
sudo pfctl -f /etc/pf.conf
```

#### Windows
```powershell
# Allow VPN traffic
netsh advfirewall firewall add rule name="OpenVPN" dir=in action=allow protocol=UDP localport=1194

# Allow web interface
netsh advfirewall firewall add rule name="VPN Web Interface" dir=in action=allow protocol=TCP localport=3000
```

### Port Forwarding

If running behind a router, configure port forwarding:

- **VPN Traffic**: UDP 1194 → Your server's local IP
- **Web Interface**: TCP 3000 → Your server's local IP (optional, for remote management)

## SSL/TLS Configuration

### Let's Encrypt (Linux/macOS)

```bash
# Install certbot
sudo apt install certbot  # Ubuntu/Debian
brew install certbot      # macOS

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Update .env with SSL paths
echo "SSL_CERT=/etc/letsencrypt/live/your-domain.com/fullchain.pem" >> .env
echo "SSL_KEY=/etc/letsencrypt/live/your-domain.com/privkey.pem" >> .env
echo "WEB_HTTPS_ONLY=true" >> .env
```

### Self-Signed Certificates

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes

# Update .env
echo "SSL_CERT=./server.crt" >> .env
echo "SSL_KEY=./server.key" >> .env
echo "WEB_HTTPS_ONLY=true" >> .env
```

## Client Certificate Management

### Generate Client Certificates

```bash
# Generate client certificate
npm run generate-client

# Bundle client configuration
npm run bundle-client

# List generated certificates
ls -la certificates/
```

### Client Configuration Files

Generated `.ovpn` files will be available in the `certificates/` directory:

```bash
# Example client files
certificates/
├── client1.ovpn
├── client2.ovpn
└── family-member.ovpn
```

## Monitoring and Logging

### Log Files

```bash
# Application logs
tail -f logs/application.log
tail -f logs/error.log

# OpenVPN logs (system-wide installation)
sudo tail -f /var/log/openvpn/openvpn.log

# OpenVPN logs (user-local installation)
tail -f ~/.privatevpn/logs/openvpn.log
```

### Health Monitoring

```bash
# Check server health
curl http://localhost:3000/health

# Monitor system resources
htop
iotop
nethogs
```

### Log Rotation

```bash
# Configure logrotate
sudo tee /etc/logrotate.d/family-vpn > /dev/null <<EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF
```

## Troubleshooting

### Common Issues

#### Permission Denied Errors

```bash
# Fix certificate permissions
sudo chown -R $USER:$USER certificates/
chmod -R 755 certificates/

# Fix OpenVPN permissions
sudo chown -R $USER:$USER /etc/openvpn/
```

#### OpenVPN Won't Start

```bash
# Check OpenVPN configuration
sudo openvpn --config /etc/openvpn/server.conf --verb 4

# Check system logs
sudo journalctl -u openvpn@server
```

#### Port Already in Use

```bash
# Find process using port
sudo netstat -tulpn | grep :3000
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>
```

#### TUN Device Issues

```bash
# Check TUN device
ls -la /dev/net/tun

# Create TUN device (if missing)
sudo mkdir -p /dev/net
sudo mknod /dev/net/tun c 10 200
sudo chmod 666 /dev/net/tun
```

### Debug Mode

```bash
# Run with debug logging
DEBUG=* npm start

# Or set log level in .env
echo "LOG_LEVEL=debug" >> .env
npm start
```

## Performance Optimization

### System Tuning

```bash
# Optimize network parameters
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# VPN optimizations
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.ip_forward = 1
EOF

sudo sysctl -p
```

### OpenVPN Optimization

```bash
# Add to OpenVPN server configuration
echo "sndbuf 0" >> /etc/openvpn/server.conf
echo "rcvbuf 0" >> /etc/openvpn/server.conf
echo "fast-io" >> /etc/openvpn/server.conf
```

## Backup and Recovery

### Backup Script

```bash
#!/bin/bash
# backup-local-vpn.sh

BACKUP_DIR="/backup/vpn"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup certificates and PKI
tar -czf $BACKUP_DIR/certificates-$DATE.tar.gz certificates/ easy-rsa/pki/

# Backup configuration
cp .env $BACKUP_DIR/env-$DATE
cp /etc/openvpn/server.conf $BACKUP_DIR/server-conf-$DATE

# Backup logs
tar -czf $BACKUP_DIR/logs-$DATE.tar.gz logs/

echo "Backup completed: $BACKUP_DIR"
```

### Recovery Process

```bash
# Stop services
sudo systemctl stop family-vpn
sudo systemctl stop openvpn@server

# Restore certificates
tar -xzf /backup/vpn/certificates-YYYYMMDD_HHMMSS.tar.gz

# Restore configuration
cp /backup/vpn/env-YYYYMMDD_HHMMSS .env
sudo cp /backup/vpn/server-conf-YYYYMMDD_HHMMSS /etc/openvpn/server.conf

# Start services
sudo systemctl start openvpn@server
sudo systemctl start family-vpn
```

## Related Documentation

- [Docker Deployment](docker.md) - Alternative containerized deployment
- [Production Best Practices](production.md) - Security and monitoring
- [Configuration Guide](../configuration/README.md) - Environment configuration
- [Troubleshooting](../troubleshooting/README.md) - Common issues and solutions