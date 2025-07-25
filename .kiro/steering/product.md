# Product Overview

This is a **Family VPN Server** - a private OpenVPN server designed for personal/family use. The application provides:

- **OpenVPN Server Management**: Automated setup and management of OpenVPN server instances
- **Certificate Management**: PKI initialization, CA setup, and automated certificate generation for clients
- **Web Interface**: Simple authentication-based client certificate download portal
- **Cross-Platform Support**: Works on macOS, Linux, and Windows with Docker containerization
- **Easy Setup**: Automated scripts for system configuration and PKI initialization

The server runs on port 1194 (UDP) for VPN traffic and port 3000 for the management web interface. It's designed to be deployed either locally or in Docker containers with proper network privileges for VPN functionality.

## Key Features
- Automated PKI and certificate management using Easy-RSA
- Client certificate generation with inline .ovpn config files
- Health monitoring and logging
- Configurable network settings (subnet, DNS, etc.)
- Support for both system-wide and user-local installations