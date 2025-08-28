# Troubleshooting Guide

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > Troubleshooting

🌐 **Language**: [English](../../en/troubleshooting/README.md) | [Русский](../../ru/troubleshooting/README.md)

## 📚 Section Navigation
- [🏠 Troubleshooting Overview](README.md) ← You are here
- [🔍 Common Issues](common-issues.md)
- [🔧 Diagnostics](diagnostics.md)
- [🔄 Recovery](recovery.md)
- [⚡ Performance](performance.md)
- [🐳 Docker Issues](docker.md)
- [🐧 Linux Issues](linux.md)
- [🍎 macOS Issues](macos.md)
- [🪟 Windows Issues](windows.md)

This section contains comprehensive troubleshooting guides for the Family VPN Server.

## Quick Navigation

### Common Issues
- [Authentication Problems](authentication.md) - Login and credential issues
- [Certificate Issues](certificates.md) - PKI and certificate generation problems
- [Network Problems](network.md) - Connectivity and routing issues
- [Docker Issues](docker.md) - Container-specific problems

### Diagnostic Tools
- [System Diagnostics](diagnostics.md) - Tools and commands for system analysis
- [Performance Issues](performance.md) - Speed and resource optimization
- [Recovery Procedures](recovery.md) - Backup and disaster recovery

### Platform-Specific
- [Linux Troubleshooting](linux.md) - Linux-specific issues and solutions
- [macOS Troubleshooting](macos.md) - macOS-specific issues and solutions
- [Windows Troubleshooting](windows.md) - Windows-specific issues and solutions
- [Docker Troubleshooting](docker.md) - Container deployment issues

## Quick Diagnostic Commands

```bash
# Check all components status
npm test

# View current logs
tail -f logs/application-$(date +%Y-%m-%d).log
tail -f logs/error-$(date +%Y-%m-%d).log
tail -f logs/security-$(date +%Y-%m-%d).log

# Check network configuration
npm run firewall:status
npm run dns:test

# System information
uname -a
node --version
npm --version
```

## Emergency Procedures

If you're experiencing critical issues:

1. **Create diagnostic report**: Follow instructions in [diagnostics.md](diagnostics.md)
2. **Check security logs**: Look for signs of attacks or breaches
3. **Create backup**: Run `npm run backup:create`
4. **Review relevant troubleshooting guide** based on your specific issue

## Getting Help

When reporting issues, please include:
- System information (OS, Node.js version)
- Error messages from logs
- Steps to reproduce the problem
- Recent configuration changes

For security-related issues, follow the procedures in [recovery.md](recovery.md).

## 🔗 Related Documentation
- [🔧 Installation Guides](../installation/README.md) - Installation troubleshooting
- [⚙️ Configuration Guides](../configuration/README.md) - Configuration issues
- [🛡️ Security Documentation](../security/README.md) - Security troubleshooting
- [🔌 API Documentation](../api/README.md) - API troubleshooting
- [🚀 Deployment Guides](../deployment/README.md) - Deployment issues

## ⚡ Quick Links
- [🏠 Home](../../../README.md)
- [📚 Documentation](../../README.md)
- [📖 First Time Setup](../../../FIRST_TIME.md)
- [👤 User Guide](../installation/user-guide.md)

---
**Previous**: [Documentation Home](../../README.md) | **Next**: [Common Issues](common-issues.md) | **Up**: [English Documentation](../README.md)