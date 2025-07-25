# Project Structure

## Root Directory
- `package.json` - Node.js project configuration and dependencies
- `Dockerfile` - Container image definition with OpenVPN and Node.js
- `docker-compose.yml` - Multi-container orchestration with network privileges
- `.gitignore` - Version control exclusions

## Source Code (`src/`)
- `server.js` - Main application entry point with Express server and OpenVPN management
- `config.js` - Centralized configuration with environment variable support
- `utils/` - Utility modules
  - `certificate-manager.js` - PKI operations, Easy-RSA integration, certificate generation

## Scripts (`scripts/`)
Automation scripts for setup, certificate management, and maintenance:
- `setup.js` - Interactive setup wizard for initial configuration
- `initialize-pki.js` - PKI infrastructure initialization
- `generate-client.js` - Client certificate generation
- `generate-client.sh` - Shell wrapper for client certificate generation
- `bundle-client.js` - Client configuration bundling
- `sign-server-cert.js` - Server certificate management
- `clean.js` - Cleanup utility for certificates and configs
- `test-easyrsa.js` - Easy-RSA functionality testing
- `setup-server.sh` - Server setup automation

## Easy-RSA (`easy-rsa/`)
PKI management toolkit with documentation and certificate templates:
- `easyrsa` - Main PKI management script
- `openssl-easyrsa.cnf` - OpenSSL configuration
- `vars.example` - Configuration template
- `doc/` - Easy-RSA documentation
- `x509-types/` - Certificate type definitions (ca, server, client, etc.)
- `pki_backup_*/` - PKI backup directories

## Configuration Patterns
- **Environment Variables**: `VPN_SUBNET`, `VPN_NETMASK`, `VPN_HOST`, `VPN_CONFIG_DIR`, `VPN_CERT_DIR`
- **Path Resolution**: Automatic detection of system vs user-local installations
- **Cross-Platform**: Platform-specific path handling for Windows, macOS, and Linux
- **Docker Integration**: Volume mounts for persistent certificate storage

## Key File Locations
- **Certificates**: `/etc/openvpn/certificates` (system) or `~/.privatevpn/certificates` (user)
- **Config Files**: `/etc/openvpn` (system) or `~/.privatevpn/config` (user)
- **Logs**: `error.log`, `combined.log` in project root
- **Client Configs**: Generated `.ovpn` files in certificates directory

## Context References
When working with this project, use file references to pull in relevant documentation:
- Configuration: `#[[file:src/config.js]]`
- Package info: `#[[file:package.json]]`
- Docker setup: `#[[file:docker-compose.yml]]`
- Easy-RSA docs: `#[[file:easy-rsa/doc/EasyRSA-Readme.md]]`
- Setup examples: `#[[file:easy-rsa/vars.example]]`

## MCP Integration
**IMPORTANT**: Use the context7 MCP server to pull in relevant documentation and context when working on this project. The context7 server is configured and should be used to:
- Fetch OpenVPN documentation and best practices
- Pull in Easy-RSA configuration examples
- Access Node.js and Express.js relevant documentation
- Get security best practices for VPN servers
- Reference Docker networking documentation for VPN containers