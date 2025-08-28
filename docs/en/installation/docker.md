# Docker Installation Guide

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [Installation](README.md) > Docker Installation

🌐 **Language**: [English](../../en/installation/docker.md) | [Русский](../../ru/installation/docker.md)

## 📚 Section Navigation
- [🏠 Installation Overview](README.md)
- [🐳 Docker Installation](docker.md) ← You are here
- [🏠 Local Installation](local.md)
- [📋 Requirements](requirements.md)
- [👤 User Guide](user-guide.md)
- [📱 Client Setup](client-setup.md)

Docker installation is the recommended method for deploying the Family VPN Server. It provides a consistent, isolated environment that works across all platforms.

## Prerequisites

Before starting, ensure you have:
- [System requirements](requirements.md) met
- Docker Engine 20.10+ installed
- Docker Compose 2.0+ installed
- Git installed (or download project as ZIP)

## Step 1: Install Docker

### Windows
1. **Download Docker Desktop**:
   - Go to https://www.docker.com/products/docker-desktop/
   - Download Docker Desktop for Windows
   - Run the installer and follow setup wizard

2. **Configure Docker**:
   - Restart computer when prompted
   - Open Docker Desktop and wait for startup
   - Verify installation: `docker --version`

### macOS
1. **Download Docker Desktop**:
   - Go to https://www.docker.com/products/docker-desktop/
   - Download Docker Desktop for Mac
   - Drag Docker to Applications folder

2. **Start Docker**:
   - Open Docker from Applications
   - Follow setup instructions
   - Verify installation: `docker --version`

### Linux (Ubuntu/Debian)
```bash
# Update package index
sudo apt update

# Install Docker using convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Logout and login again, then verify
docker --version
docker compose version
```

### Linux (CentOS/RHEL)
```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
```

## Step 2: Download the VPN Server

### Option A: Using Git
```bash
# Clone the repository
git clone https://github.com/your-username/family-vpn-server.git
cd family-vpn-server
```

### Option B: Download ZIP
1. Go to the GitHub repository
2. Click "Code" → "Download ZIP"
3. Extract the ZIP file
4. Open terminal in the extracted folder

## Step 3: Configure Environment

### Create Environment File
```bash
# Copy example configuration
cp .env.example .env

# Edit configuration
nano .env
```

### Essential Configuration
Edit the `.env` file with your settings:

```env
# Server Configuration
VPN_HOST=YOUR_SERVER_IP_ADDRESS
VPN_PORT=1194
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Web Interface
API_PORT=3000
NODE_ENV=production

# Security Settings
JWT_SECRET=your_secure_jwt_secret_here
SESSION_SECRET=your_secure_session_secret_here

# Logging
LOG_LEVEL=info
```

**Important**: Replace `YOUR_SERVER_IP_ADDRESS` with:
- **Local installation**: Your computer's IP address
- **Cloud deployment**: Your server's public IP address
- **Home network**: Your router's external IP address

### Find Your IP Address

#### Windows
```cmd
# Open Command Prompt and run:
ipconfig

# Look for "IPv4 Address" under your active network adapter
```

#### macOS
```bash
# Get local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or use System Preferences → Network → Advanced → TCP/IP
```

#### Linux
```bash
# Get local IP
hostname -I

# Or
ip addr show | grep "inet " | grep -v 127.0.0.1
```

#### Public IP (for cloud servers)
```bash
# Get public IP
curl ifconfig.me
# or
curl ipinfo.io/ip
```

## Step 4: Build and Deploy

### Quick Deployment
```bash
# Build the Docker image
npm run docker:build

# Start the services
npm run docker:up

# Check status
npm run docker:logs
```

### Manual Docker Commands
```bash
# Build image
docker build -t family-vpn-server .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Check running containers
docker-compose ps
```

## Step 5: Initial Setup

### Create Admin Credentials
```bash
# Set up admin authentication
docker exec -it family-vpn-server npm run setup-auth

# Follow the prompts to create username and password
```

### Initialize PKI (Certificate System)
```bash
# Initialize the certificate authority
docker exec -it family-vpn-server npm run init-pki

# This creates the CA and server certificates
```

### Apply Security Hardening
```bash
# Apply security configurations
docker exec -it family-vpn-server npm run harden-config

# Set up firewall rules (if on Linux host)
docker exec -it family-vpn-server npm run firewall:init
```

## Step 6: Verify Installation

### Check Service Status
```bash
# View container status
docker-compose ps

# Check logs for errors
docker-compose logs family-vpn-server

# Test web interface
curl -k http://localhost:3000/health
```

### Access Web Interface
1. **Open browser** and navigate to:
   - Local: `http://localhost:3000`
   - Remote: `http://YOUR_SERVER_IP:3000`

2. **Login** with the credentials you created

3. **Verify** you can see the VPN management interface

## Step 7: Generate Client Certificates

### Using Web Interface
1. **Access management portal** at `http://YOUR_SERVER_IP:3000`
2. **Login** with admin credentials
3. **Click "Generate New Certificate"**
4. **Enter client name** (e.g., "john-laptop")
5. **Download the .ovpn file**

### Using Command Line
```bash
# Generate client certificate
docker exec -it family-vpn-server npm run generate-client

# Follow prompts to enter client name
# Certificate will be created in certificates/ directory
```

## Docker Configuration Details

### Container Architecture
The Docker setup includes:
- **Base Image**: Alpine Linux (minimal, secure)
- **Runtime**: Node.js 18
- **VPN Software**: OpenVPN with Easy-RSA
- **Security**: Non-root user, minimal privileges

### Volume Mounts
```yaml
volumes:
  - ./easy-rsa:/app/easy-rsa          # PKI management
  - vpn-certificates:/app/certificates # Certificate storage
  - vpn-logs:/app/logs                # Log storage
```

### Network Configuration
```yaml
ports:
  - "1194:1194/udp"  # OpenVPN traffic
  - "3000:3000/tcp"  # Web management interface

cap_add:
  - NET_ADMIN        # Required for VPN functionality

devices:
  - /dev/net/tun:/dev/net/tun  # TUN device access
```

### Environment Variables
Key environment variables in the container:
```env
VPN_CERT_DIR=/app/certificates
VPN_CONFIG_DIR=/app/config
NODE_ENV=production
DOCKER_ENV=true
```

## Production Deployment

### Using Production Compose File
```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d

# This includes:
# - SSL/TLS termination
# - Enhanced security settings
# - Production logging
# - Health checks
```

### SSL/HTTPS Setup
```bash
# Generate SSL certificates (Let's Encrypt)
docker exec -it family-vpn-server-prod npm run ssl:generate

# Or use existing certificates
# Mount them in docker-compose.prod.yml
```

## Management Commands

### Container Management
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Execute commands in container
docker exec -it family-vpn-server bash
```

### Backup and Restore
```bash
# Create backup
docker exec -it family-vpn-server npm run backup:create

# List backups
docker exec -it family-vpn-server npm run backup:list

# Restore from backup
docker exec -it family-vpn-server npm run backup:restore
```

### Updates
```bash
# Pull latest image
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Clean old images
docker image prune
```

## Troubleshooting

### Common Issues

#### "Container won't start"
```bash
# Check logs
docker-compose logs family-vpn-server

# Common causes:
# - Port conflicts (change ports in docker-compose.yml)
# - Permission issues (check file ownership)
# - Missing TUN device (ensure /dev/net/tun exists)
```

#### "Can't access web interface"
```bash
# Check if container is running
docker-compose ps

# Check port binding
docker port family-vpn-server

# Test connectivity
curl -k http://localhost:3000/health

# Check firewall
sudo ufw status
```

#### "VPN clients can't connect"
```bash
# Check OpenVPN process
docker exec -it family-vpn-server ps aux | grep openvpn

# Check VPN port
docker exec -it family-vpn-server netstat -ulnp | grep 1194

# Check logs
docker exec -it family-vpn-server tail -f /var/log/openvpn/openvpn.log
```

#### "Permission denied" errors
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# For Docker socket access
sudo usermod -aG docker $USER
# Logout and login again
```

### Debug Mode
```bash
# Run in debug mode
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up

# Or set debug environment
docker run -it --rm \
  -e DEBUG=* \
  -e LOG_LEVEL=debug \
  family-vpn-server npm start
```

## Security Considerations

### Container Security
- **Non-root user**: Container runs as unprivileged user
- **Minimal capabilities**: Only NET_ADMIN capability added
- **Read-only filesystem**: Most filesystem is read-only
- **No shell access**: Production containers have no shell

### Network Security
- **Firewall rules**: Restrict access to management interface
- **TLS encryption**: Use HTTPS for web interface
- **VPN encryption**: Strong OpenVPN encryption settings

### Data Protection
- **Volume encryption**: Consider encrypting Docker volumes
- **Certificate security**: Protect certificate storage
- **Backup encryption**: Encrypt backups before storage

## Next Steps

After successful Docker installation:

1. **[Environment Configuration](../configuration/environment.md)**
2. **[Security Configuration](../configuration/security.md)**
3. **[Certificate Management](../configuration/certificates.md)**
4. **[Client Setup](../troubleshooting/common-issues.md#client-setup)**

## Advanced Docker Configuration

### Custom Networks
```yaml
# docker-compose.yml
networks:
  vpn-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Resource Limits
```yaml
# docker-compose.yml
services:
  vpn-server:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Health Checks
```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## 🔗 Related Documentation
- [⚙️ Environment Configuration](../configuration/environment.md) - Configure environment variables
- [🛡️ Security Configuration](../configuration/security.md) - Secure your Docker deployment
- [🚀 Docker Deployment Guide](../deployment/docker.md) - Advanced Docker deployment
- [❓ Docker Troubleshooting](../troubleshooting/docker.md) - Solve Docker issues

## ⚡ Quick Links
- [🏠 Home](../../../README.md)
- [📚 Documentation](../../README.md)
- [📖 First Time Setup](../../../FIRST_TIME.md)
- [🔧 Installation Overview](README.md)

---
**Previous**: [Installation Overview](README.md) | **Next**: [Local Installation](local.md) | **Up**: [Installation Guides](README.md)