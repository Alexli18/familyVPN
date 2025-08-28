# System Requirements

This document outlines the system requirements and prerequisites for installing the Family VPN Server.

## Minimum System Requirements

### Hardware Requirements
- **CPU**: 1 core (2+ cores recommended)
- **RAM**: 512 MB (1 GB+ recommended)
- **Storage**: 2 GB free space (5 GB+ recommended)
- **Network**: Internet connection with static IP (recommended)

### Software Requirements
- **Node.js**: Version 12.0.0 or higher
- **OpenVPN**: System installation required
- **Operating System**: See platform support below

## Platform Support

### ✅ Fully Supported Platforms

#### Linux
- **Ubuntu**: 18.04 LTS, 20.04 LTS, 22.04 LTS
- **Debian**: 9, 10, 11, 12
- **CentOS**: 7, 8, Stream
- **RHEL**: 7, 8, 9
- **Fedora**: 35, 36, 37, 38
- **Arch Linux**: Rolling release

#### macOS
- **macOS**: 10.15 (Catalina) or newer
- **Architecture**: Intel x64, Apple Silicon (M1/M2)

#### Windows
- **Windows**: 10, 11, Server 2019, Server 2022
- **Architecture**: x64

### 🐳 Docker Support
- **Docker**: 20.10.0 or higher
- **Docker Compose**: 2.0.0 or higher
- **Platforms**: Any platform supporting Docker

## Network Requirements

### Ports
- **UDP 1194**: OpenVPN traffic (configurable)
- **TCP 3000**: Web management interface (configurable)
- **TCP 22**: SSH access (for remote management)

### Firewall Configuration
The following ports must be accessible:
```bash
# OpenVPN traffic
ufw allow 1194/udp

# Management interface (restrict to admin IPs)
ufw allow from YOUR_ADMIN_IP to any port 3000

# SSH (optional, for remote management)
ufw allow ssh
```

### Network Capabilities
- **TUN/TAP support**: Required for VPN functionality
- **IP forwarding**: Must be enabled
- **NAT/Masquerading**: Required for client internet access

## Prerequisites by Installation Method

### Docker Installation
```bash
# Required software
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git (for cloning repository)

# System capabilities
- Container runtime support
- Network namespace support
- TUN/TAP device access
```

### Local Installation

#### Linux (Ubuntu/Debian)
```bash
# Update package list
sudo apt update

# Install required packages
sudo apt install -y nodejs npm openvpn easy-rsa git curl

# Verify versions
node --version    # Should be 12.0.0+
npm --version
openvpn --version
```

#### Linux (CentOS/RHEL)
```bash
# Install Node.js repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Install packages
sudo yum install -y nodejs openvpn easy-rsa git curl

# Or for newer versions
sudo dnf install -y nodejs npm openvpn easy-rsa git curl
```

#### macOS
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required packages
brew install node openvpn easy-rsa git

# Verify installations
node --version
openvpn --version
```

#### Windows
1. **Node.js**:
   - Download from https://nodejs.org/
   - Install LTS version (18.x recommended)

2. **OpenVPN**:
   - Download from https://openvpn.net/community-downloads/
   - Install "OpenVPN" (not OpenVPN Connect)

3. **Git** (optional):
   - Download from https://git-scm.com/
   - Or download project as ZIP

## Cloud Platform Requirements

### AWS EC2
- **Instance Type**: t3.micro or larger
- **AMI**: Ubuntu 22.04 LTS, Amazon Linux 2
- **Security Groups**:
  - Inbound: UDP 1194, TCP 3000 (restricted), SSH
  - Outbound: All traffic
- **Elastic IP**: Recommended for consistent access

### Google Cloud Platform
- **Machine Type**: e2-micro or larger
- **Image**: Ubuntu 22.04 LTS, Debian 11
- **Firewall Rules**:
  - Allow UDP 1194 from 0.0.0.0/0
  - Allow TCP 3000 from admin IPs
- **Static IP**: Recommended

### DigitalOcean
- **Droplet**: Basic plan ($5/month minimum)
- **Image**: Ubuntu 22.04 LTS
- **Firewall**: Configure for VPN and management ports
- **Reserved IP**: Recommended

### Azure
- **VM Size**: B1s or larger
- **Image**: Ubuntu 22.04 LTS
- **Network Security Group**: Configure appropriate rules
- **Public IP**: Static assignment recommended

## Performance Considerations

### Concurrent Users
- **1-5 users**: 1 CPU, 1 GB RAM
- **5-15 users**: 2 CPU, 2 GB RAM
- **15-50 users**: 4 CPU, 4 GB RAM
- **50+ users**: Scale horizontally or upgrade

### Bandwidth Requirements
- **Per user**: 1-10 Mbps (depending on usage)
- **Server**: Ensure adequate upstream bandwidth
- **Monitoring**: Set up bandwidth monitoring

### Storage Requirements
- **Certificates**: ~1 MB per client certificate
- **Logs**: 10-100 MB per day (depending on verbosity)
- **Backups**: Plan for certificate backup storage

## Security Requirements

### System Security
- **Updates**: Keep OS and packages updated
- **Firewall**: Configure restrictive firewall rules
- **SSH**: Use key-based authentication
- **Monitoring**: Set up log monitoring

### VPN Security
- **Certificates**: Strong key sizes (2048-bit minimum)
- **Encryption**: AES-256 or stronger
- **Authentication**: Strong admin passwords
- **Access Control**: Limit management interface access

## Verification Commands

After meeting requirements, verify your system:

```bash
# Check Node.js version
node --version

# Check OpenVPN installation
openvpn --version

# Check TUN/TAP support (Linux)
ls -la /dev/net/tun

# Check IP forwarding (Linux)
cat /proc/sys/net/ipv4/ip_forward

# Check available memory
free -h

# Check disk space
df -h

# Test network connectivity
ping -c 4 8.8.8.8
```

## Troubleshooting Requirements Issues

### Common Issues

#### "Node.js version too old"
```bash
# Update Node.js to latest LTS
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew upgrade node

# Windows
# Download and install from nodejs.org
```

#### "OpenVPN not found"
```bash
# Ubuntu/Debian
sudo apt install openvpn

# CentOS/RHEL
sudo yum install openvpn

# macOS
brew install openvpn

# Windows
# Download from openvpn.net/community-downloads/
```

#### "TUN/TAP device not available"
```bash
# Linux - load TUN module
sudo modprobe tun

# Verify
ls -la /dev/net/tun

# Make persistent
echo 'tun' | sudo tee -a /etc/modules
```

#### "Permission denied" errors
```bash
# Ensure user has proper permissions
sudo usermod -aG sudo $USER

# For Docker
sudo usermod -aG docker $USER

# Logout and login again
```

## Next Steps

Once requirements are met:

1. **Choose installation method**:
   - [Docker Installation](docker.md) (recommended)
   - [Local Installation](local.md)

2. **Prepare environment**:
   - [Environment Configuration](../configuration/environment.md)

3. **Security setup**:
   - [Security Configuration](../configuration/security.md)