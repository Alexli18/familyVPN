# Security Documentation

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > Security

🌐 **Language**: [English](../../en/security/README.md) | [Русский](../../ru/security/README.md)

## 📚 Section Navigation
- [🏠 Security Overview](README.md) ← You are here
- [🔍 Security Overview](overview.md)
- [🔐 Authentication System](authentication.md)
- [🔒 Encryption & Cryptography](encryption.md)
- [📊 Security Monitoring](monitoring.md)
- [✅ Best Practices](best-practices.md)

This directory contains comprehensive security documentation for the Family VPN Server.

## Documentation Structure

### [Security Overview](overview.md)
Complete security architecture and key security features. Start here for a comprehensive understanding of the security system.

### [Authentication System](authentication.md)
Detailed documentation on user authentication, session management, JWT tokens, and password security.

### [Encryption and Cryptography](encryption.md)
Comprehensive coverage of cryptographic security including VPN encryption, certificate management, and key handling.

### [Security Monitoring](monitoring.md)
Security monitoring, logging, threat detection, and alerting systems.

### [Best Practices](best-practices.md)
Operational security guidelines, deployment security, and security best practices for administrators and users.

## Quick Security Checklist

### Initial Setup
- [ ] Run authentication setup: `npm run setup-auth`
- [ ] Configure firewall rules: `npm run firewall:init`
- [ ] Initialize PKI: `npm run init-pki`
- [ ] Apply security hardening: `npm run harden-config`

### Regular Maintenance
- [ ] Review security logs weekly
- [ ] Update JWT secrets monthly
- [ ] Rotate certificates annually
- [ ] Update system dependencies regularly

### Security Monitoring
- [ ] Monitor failed authentication attempts
- [ ] Check firewall status regularly
- [ ] Review certificate expiration dates
- [ ] Validate security configurations

## Security Features Overview

### Authentication & Authorization
- JWT token-based API authentication
- Session-based web interface authentication
- bcrypt password hashing with 12 salt rounds
- Rate limiting and brute force protection
- Account lockout mechanisms

### Encryption & Cryptography
- AES-256-GCM encryption for VPN traffic
- Perfect Forward Secrecy with ECDH
- RSA-2048+ certificates with SHA-256 signatures
- TLS 1.2+ for all encrypted communications
- Secure random number generation

### Network Security
- Comprehensive firewall rules (iptables)
- Minimal attack surface with port restrictions
- Network segmentation and traffic filtering
- DDoS protection and connection throttling

### Monitoring & Alerting
- Structured security event logging
- Real-time threat detection
- Automated alerting for security events
- Performance and resource monitoring

## Getting Help

For security-related issues:

1. **Check Security Logs**: Review `logs/security-*.log` files
2. **Run Security Scan**: Execute `npm run security-scan`
3. **Verify Configuration**: Check firewall status with `npm run firewall:status`
4. **Consult Documentation**: Review specific security component documentation
5. **Report Issues**: Follow responsible disclosure for security vulnerabilities

## 🔗 Related Documentation
- [🔧 Installation Guide](../installation/) - Secure installation procedures
- [⚙️ Configuration Guide](../configuration/) - Security configuration options
- [🔌 API Documentation](../api/) - API security and authentication
- [❓ Troubleshooting](../troubleshooting/) - Security troubleshooting guides
- [🚀 Deployment Guide](../deployment/) - Secure deployment practices

## ⚡ Quick Links
- [🏠 Home](../../../README.md)
- [📚 Documentation](../../README.md)
- [📖 First Time Setup](../../../FIRST_TIME.md)
- [🔐 Authentication API](../api/authentication.md)

---
**Previous**: [Documentation Home](../../README.md) | **Next**: [Security Overview](overview.md) | **Up**: [English Documentation](../README.md)