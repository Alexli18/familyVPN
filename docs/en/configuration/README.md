# Configuration Guides

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > Configuration

🌐 **Language**: [English](../../en/configuration/README.md) | [Русский](../../ru/configuration/README.md)

## 📚 Section Navigation
- [🏠 Configuration Overview](README.md) ← You are here
- [🌍 Environment Configuration](environment.md)
- [🛡️ Security Configuration](security.md)
- [🌐 Network Configuration](networking.md)
- [📜 Certificate Configuration](certificates.md)
- [💻 Web Interface Configuration](web-interface.md)

This section contains comprehensive configuration guides for the Family VPN Server, covering all aspects of setup and customization.

## Quick Navigation

### Core Configuration
- **[Environment Configuration](environment.md)** - Environment variables and basic settings
- **[Security Configuration](security.md)** - Authentication, encryption, and security hardening
- **[Network Configuration](networking.md)** - Network settings, firewall, and routing
- **[Certificate Configuration](certificates.md)** - PKI setup and certificate management
- **[Web Interface Configuration](web-interface.md)** - Web-based management interface setup

### Configuration Categories

#### 🔧 Basic Configuration
Essential settings to get your VPN server running:
- Server IP and port settings
- Network subnet configuration
- Basic authentication setup
- Default security settings

#### 🛡️ Security Configuration
Advanced security settings for production use:
- Strong encryption parameters
- Authentication mechanisms
- Firewall rules and network security
- Access control and monitoring

#### 🌐 Network Configuration
Network-related settings and optimization:
- VPN subnet and routing
- DNS configuration
- Firewall integration
- Performance tuning

#### 📜 Certificate Management
PKI and certificate-related configuration:
- Certificate Authority setup
- Client certificate generation
- Certificate lifecycle management
- Backup and recovery

## Configuration Workflow

### 1. Initial Setup
Start with basic configuration after installation:

1. **[Environment Setup](environment.md#initial-setup)**
2. **[Basic Security](security.md#basic-security-setup)**
3. **[Network Configuration](networking.md#basic-network-setup)**
4. **[Certificate Initialization](certificates.md#pki-initialization)**

### 2. Security Hardening
Apply security best practices:

1. **[Authentication Hardening](security.md#authentication-hardening)**
2. **[Encryption Configuration](security.md#encryption-configuration)**
3. **[Firewall Setup](networking.md#firewall-configuration)**
4. **[Access Control](security.md#access-control)**

### 3. Production Optimization
Optimize for production deployment:

1. **[Performance Tuning](networking.md#performance-optimization)**
2. **[Monitoring Setup](security.md#monitoring-and-logging)**
3. **[Backup Configuration](certificates.md#backup-and-recovery)**
4. **[Maintenance Procedures](environment.md#maintenance-configuration)**

## Configuration Files Overview

### Primary Configuration Files

#### Environment Configuration (`.env`)
```env
# Server settings
VPN_HOST=your-server-ip
VPN_PORT=1194
API_PORT=3000

# Network settings
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Security settings
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

#### OpenVPN Configuration (`openvpn.conf`)
```conf
# Basic server settings
port 1194
proto udp
dev tun

# Certificate and key files
ca ca.crt
cert server.crt
key server.key
dh dh.pem

# Network settings
server 10.8.0.0 255.255.255.0
```

#### Application Configuration (`src/config.js`)
```javascript
module.exports = {
  vpn: {
    subnet: process.env.VPN_SUBNET || '10.8.0.0',
    netmask: process.env.VPN_NETMASK || '255.255.255.0',
    port: 1194,
    protocol: 'udp'
  },
  // ... other settings
};
```

### Configuration Hierarchy

1. **Environment Variables** (highest priority)
2. **`.env` file**
3. **Configuration files**
4. **Default values** (lowest priority)

## Common Configuration Scenarios

### Home Network Setup
For family use on home network:
- Use private IP ranges
- Configure router port forwarding
- Set up dynamic DNS (optional)
- Basic security settings

### Cloud Server Setup
For cloud deployment (AWS, GCP, etc.):
- Use public IP addresses
- Configure cloud firewall rules
- Set up SSL certificates
- Enhanced security settings

### Corporate/Advanced Setup
For business or advanced users:
- Multiple server locations
- Advanced authentication
- Comprehensive monitoring
- High availability configuration

## Configuration Validation

### Validation Commands
```bash
# Test configuration syntax
npm run config:validate

# Test network connectivity
npm run network:test

# Verify security settings
npm run security:audit

# Check certificate validity
npm run cert:verify
```

### Configuration Testing
```bash
# Test VPN server startup
npm run test:startup

# Test client connection
npm run test:client-connect

# Test web interface
npm run test:web-interface

# Full system test
npm test
```

## Troubleshooting Configuration

### Common Configuration Issues

#### Environment Variables Not Loading
```bash
# Check .env file exists and is readable
ls -la .env
cat .env

# Verify environment loading
node -e "require('dotenv').config(); console.log(process.env.VPN_HOST)"
```

#### OpenVPN Configuration Errors
```bash
# Test OpenVPN config syntax
openvpn --config /path/to/openvpn.conf --test-crypto

# Check certificate files
openssl x509 -in certificates/server.crt -text -noout
```

#### Network Configuration Problems
```bash
# Test network connectivity
ping -c 4 8.8.8.8

# Check routing
ip route show

# Verify firewall rules
sudo ufw status verbose
```

### Debug Configuration
```bash
# Run with debug logging
DEBUG=config:* npm start

# Check configuration loading
LOG_LEVEL=debug npm start

# Validate all settings
npm run config:debug
```

## Security Considerations

### Configuration Security
- **Protect sensitive files**: Secure `.env` and certificate files
- **Use strong secrets**: Generate cryptographically secure secrets
- **Regular updates**: Keep configuration updated with security patches
- **Access control**: Limit who can modify configuration

### Best Practices
- **Version control**: Track configuration changes (exclude secrets)
- **Backup configuration**: Regular backups of configuration and certificates
- **Documentation**: Document custom configuration changes
- **Testing**: Test configuration changes in development first

## Getting Help

### Configuration Support
1. **Check the specific configuration guide** for your area
2. **Review [troubleshooting guides](../troubleshooting/)**
3. **Validate configuration** using built-in tools
4. **Check logs** for configuration errors

### Configuration Examples
Each configuration guide includes:
- Step-by-step instructions
- Example configuration files
- Common use cases
- Troubleshooting tips

## Next Steps

Choose the configuration area you need to set up:

1. **New Installation**: Start with [Environment Configuration](environment.md)
2. **Security Focus**: Go to [Security Configuration](security.md)
3. **Network Issues**: Check [Network Configuration](networking.md)
4. **Certificate Problems**: See [Certificate Configuration](certificates.md)

## 🔗 Related Documentation
- [🔧 Installation Guides](../installation/README.md) - Installation prerequisites and setup
- [🚀 Deployment Guides](../deployment/README.md) - Platform-specific deployment
- [🛡️ Security Documentation](../security/README.md) - Security features and hardening
- [🔌 API Documentation](../api/README.md) - API configuration and usage
- [❓ Troubleshooting](../troubleshooting/README.md) - Configuration troubleshooting

## ⚡ Quick Links
- [🏠 Home](../../../README.md)
- [📚 Documentation](../../README.md)
- [📖 First Time Setup](../../../FIRST_TIME.md)
- [👤 User Guide](../installation/user-guide.md)

---
**Previous**: [Documentation Home](../../README.md) | **Next**: [Environment Configuration](environment.md) | **Up**: [English Documentation](../README.md)