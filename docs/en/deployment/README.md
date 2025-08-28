# Deployment Guide

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > Deployment

🌐 **Language**: [English](../../en/deployment/README.md) | [Русский](../../ru/deployment/README.md)

## 📚 Section Navigation
- [🏠 Deployment Overview](README.md) ← You are here
- [🐳 Docker Deployment](docker.md)
- [🏠 Local Deployment](local.md)
- [☁️ AWS Deployment](aws.md)
- [☁️ Google Cloud Deployment](gcp.md)
- [☁️ Azure Deployment](azure.md)
- [🌊 DigitalOcean Deployment](digitalocean.md)
- [🚀 Production Best Practices](production.md)
- [🔧 Performance Optimization](performance.md)

This section provides comprehensive deployment guides for the Family VPN Server across different platforms and environments.

## Quick Navigation

### Platform-Specific Guides
- [🐳 Docker Deployment](docker.md) - Containerized deployment (recommended)
- [🏠 Local Deployment](local.md) - Direct system installation
- [☁️ AWS Deployment](aws.md) - Amazon Web Services EC2
- [☁️ Google Cloud Deployment](gcp.md) - Google Cloud Platform
- [☁️ Azure Deployment](azure.md) - Microsoft Azure
- [🌊 DigitalOcean Deployment](digitalocean.md) - DigitalOcean Droplets

### Production Guides
- [🚀 Production Best Practices](production.md) - Security, monitoring, and maintenance
- [🔧 Performance Optimization](performance.md) - Tuning for production workloads

## Deployment Overview

The Family VPN Server can be deployed in several ways:

1. **Docker (Recommended)**: Containerized deployment with docker-compose
2. **Local Installation**: Direct installation on the host system
3. **Cloud Platforms**: Managed cloud instances with platform-specific configurations

## Prerequisites

### System Requirements
- **Minimum**: 1 CPU, 1GB RAM, 10GB disk space
- **Recommended**: 2 CPU, 2GB RAM, 20GB disk space
- **Network**: Static IP address or dynamic DNS

### Software Requirements
- Node.js 12.0.0 or higher
- OpenVPN 2.4 or higher
- Git for source code management
- Administrative/root privileges

### Network Requirements
- **VPN Port**: UDP 1194 (configurable)
- **Management Port**: TCP 3000 (HTTPS in production)
- **Firewall**: Proper port forwarding and security group configuration

## Quick Start

For first-time users, we recommend starting with Docker deployment:

```bash
# 1. Clone the repository
git clone <repository-url>
cd family-vpn-server

# 2. Copy environment configuration
cp .env.example .env

# 3. Run setup wizard
npm run setup

# 4. Deploy with Docker
docker-compose up -d

# 5. Access web interface
open http://localhost:3000
```

For detailed platform-specific instructions, choose the appropriate guide from the navigation above.

## Security Considerations

All deployment methods include:
- PKI certificate management with Easy-RSA
- Encrypted VPN tunnels with OpenVPN
- Web interface authentication
- Comprehensive logging and monitoring

For production deployments, see the [Production Best Practices](production.md) guide for additional security hardening.

## Support

If you encounter issues during deployment:
1. Check the [Troubleshooting Guide](../troubleshooting/README.md)
2. Review the platform-specific deployment guide
3. Verify system requirements and prerequisites
4. Check the application logs for error messages

## 🔗 Related Documentation
- [🔧 Installation Guides](../installation/README.md) - System setup and prerequisites
- [⚙️ Configuration Guides](../configuration/README.md) - Environment and security configuration
- [🛡️ Security Documentation](../security/README.md) - Security features and best practices
- [🔌 API Documentation](../api/README.md) - API deployment considerations
- [❓ Troubleshooting](../troubleshooting/README.md) - Deployment troubleshooting

## ⚡ Quick Links
- [🏠 Home](../../../README.md)
- [📚 Documentation](../../README.md)
- [📖 First Time Setup](../../../FIRST_TIME.md)
- [👤 User Guide](../installation/user-guide.md)

---
**Previous**: [Documentation Home](../../README.md) | **Next**: [Docker Deployment](docker.md) | **Up**: [English Documentation](../README.md)