# Local Installation Guide

This guide covers installing the Family VPN Server directly on your system without Docker. This method provides better performance and direct system integration but requires more setup steps.

## Prerequisites

Before starting, ensure you have:
- [System requirements](requirements.md) met
- Administrator/root privileges
- Internet connection
- Basic command line knowledge

## Step 1: Install Dependencies

### Windows

#### Install Node.js
1. **Download Node.js**:
   - Go to https://nodejs.org/
   - Download the LTS version (18.x recommended)
   - Run the installer with default settings

2. **Verify installation**:
   ```cmd
   node --version
   npm --version
   ```

#### Install OpenVPN
1. **Download OpenVPN**:
   - Go to https://openvpn.net/community-downloads/
   - Download "OpenVPN" (not OpenVPN Connect)
   - Install with default settings

2. **Verify installation**:
   ```cmd
   "C:\Program Files\OpenVPN\bin\openvpn.exe" --version
   ```

#### Install Git (Optional)
1. **Download Git**:
   - Go to https://git-scm.com/
   - Download and install Git for Windows
   - Or download project as ZIP file

### macOS

#### Install Homebrew (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Install Dependencies
```bash
# Install Node.js, OpenVPN, and Easy-RSA
brew install node openvpn easy-rsa git

# Verify installations
node --version
openvpn --version
```

### Linux (Ubuntu/Debian)

#### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### Install Node.js
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### Install OpenVPN and Easy-RSA
```bash
# Install OpenVPN and certificate management tools
sudo apt install -y openvpn easy-rsa git curl

# Verify installation
openvpn --version
```

### Linux (CentOS/RHEL/Fedora)

#### Install Node.js
```bash
# CentOS/RHEL 7-8
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Fedora
sudo dnf install -y nodejs npm

# Verify installation
node --version
```

#### Install OpenVPN
```bash
# CentOS/RHEL
sudo yum install -y epel-release
sudo yum install -y openvpn easy-rsa git

# Fedora
sudo dnf install -y openvpn easy-rsa git

# Verify installation
openvpn --version
```

## Step 2: Download and Setup Project

### Download Project
```bash
# Option A: Clone with Git
git clone https://github.com/your-username/family-vpn-server.git
cd family-vpn-server

# Option B: Download ZIP and extract
# Then navigate to the extracted folder
```

### Install Project Dependencies
```bash
# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

## Step 3: System Configuration

### Enable IP Forwarding

#### Linux
```bash
# Enable IP forwarding temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Make permanent
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

#### macOS
```bash
# Enable IP forwarding
sudo sysctl -w net.inet.ip.forwarding=1

# Make permanent (add to /etc/sysctl.conf)
echo 'net.inet.ip.forwarding=1' | sudo tee -a /etc/sysctl.conf
```

#### Windows
IP forwarding is typically enabled by default on Windows. If needed:
```cmd
# Run as Administrator
netsh interface ipv4 set global forwarding=enabled
```

### Configure TUN/TAP Device

#### Linux
```bash
# Load TUN module
sudo modprobe tun

# Verify TUN device exists
ls -la /dev/net/tun

# Make TUN module load at boot
echo 'tun' | sudo tee -a /etc/modules
```

#### macOS
TUN/TAP support is included with OpenVPN installation.

#### Windows
TUN/TAP driver is installed with OpenVPN.

## Step 4: Run Setup Wizard

### Interactive Setup
```bash
# Run the setup wizard
npm run setup

# Follow the prompts:
# 1. Choose installation type (system-wide or user-local)
# 2. Configure directories
# 3. Set network parameters
```

### Setup Options

#### Option 1: System-wide Installation (Recommended for servers)
- **Requires**: Administrator/root privileges
- **Config location**: `/etc/openvpn` (Linux/macOS) or `C:\ProgramData\OpenVPN` (Windows)
- **Benefits**: Standard locations, system service integration
- **Use case**: Dedicated servers, production deployments

#### Option 2: User-local Installation (Recommended for development)
- **Requires**: Regular user privileges
- **Config location**: `~/.privatevpn/` (all platforms)
- **Benefits**: No admin rights needed, isolated from system
- **Use case**: Development, testing, personal use

### Example Setup Session
```bash
$ npm run setup

Setting up PrivateVPN environment...
Detected platform: linux

Would you like to:
1) Use system directories (requires admin/sudo privileges)
2) Use local directories in your home folder (recommended)

Enter your choice (1 or 2): 2

Using local directory: /home/user/.privatevpn
Created .env file with local paths
Creating configuration directories...
✅ Directories created successfully!
✅ Hardened OpenVPN config created
✅ Found OpenVPN at: /usr/bin/openvpn
✅ Found Easy-RSA at: /usr/share/easy-rsa
✅ Created/updated config.js with your selected paths

✅ Setup completed successfully!

Configuration directory: /home/user/.privatevpn/config
Certificates directory: /home/user/.privatevpn/certificates
```

## Step 5: Authentication Setup

### Create Admin Credentials
```bash
# Set up admin authentication
npm run setup-auth

# Follow prompts to create:
# - Admin username
# - Secure password
# - JWT secrets
```

### Example Authentication Setup
```bash
$ npm run setup-auth

🔐 VPN Server Authentication Setup

Enter admin username: admin
Enter admin password: [secure password]
Confirm password: [secure password]

✅ Password hash generated
✅ JWT secrets generated
✅ Authentication configuration saved to .env

Admin credentials created successfully!
Username: admin
Configuration saved to: .env
```

## Step 6: Initialize PKI (Certificate System)

### Create Certificate Authority
```bash
# Initialize PKI infrastructure
npm run init-pki

# This creates:
# - Certificate Authority (CA)
# - Server certificates
# - Diffie-Hellman parameters
```

### PKI Initialization Process
```bash
$ npm run init-pki

🔐 Initializing PKI infrastructure...

Creating Certificate Authority...
✅ CA certificate created
✅ CA private key secured

Generating server certificates...
✅ Server certificate created
✅ Server private key secured

Generating Diffie-Hellman parameters...
✅ DH parameters generated (this may take several minutes)

Creating TLS-Auth key...
✅ TLS-Auth key generated

✅ PKI initialization completed successfully!

Certificate files created:
- CA Certificate: certificates/ca.crt
- Server Certificate: certificates/server.crt
- Server Key: certificates/server.key
- DH Parameters: certificates/dh.pem
- TLS-Auth Key: certificates/ta.key
```

## Step 7: Security Hardening

### Apply Security Configuration
```bash
# Apply security hardening
npm run harden-config

# This configures:
# - Strong encryption settings
# - Secure OpenVPN parameters
# - Firewall-friendly settings
```

### Configure System Firewall

#### Linux (UFW)
```bash
# Enable firewall
sudo ufw enable

# Allow OpenVPN traffic
sudo ufw allow 1194/udp

# Allow management interface (restrict to your IP)
sudo ufw allow from YOUR_ADMIN_IP to any port 3000

# Allow SSH (if remote server)
sudo ufw allow ssh

# Check status
sudo ufw status
```

#### Linux (iptables)
```bash
# Allow OpenVPN
sudo iptables -A INPUT -p udp --dport 1194 -j ACCEPT

# Allow management interface
sudo iptables -A INPUT -p tcp --dport 3000 -s YOUR_ADMIN_IP -j ACCEPT

# Allow established connections
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Save rules (Ubuntu/Debian)
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

#### macOS
```bash
# macOS firewall is typically managed through System Preferences
# Or use pfctl for advanced configuration

# Allow OpenVPN through macOS firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/sbin/openvpn
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/sbin/openvpn
```

#### Windows
```cmd
# Run as Administrator
# Allow OpenVPN through Windows Firewall
netsh advfirewall firewall add rule name="OpenVPN" dir=in action=allow protocol=UDP localport=1194

# Allow management interface
netsh advfirewall firewall add rule name="VPN Management" dir=in action=allow protocol=TCP localport=3000
```

## Step 8: Start the Server

### Development Mode
```bash
# Start in development mode (with auto-reload)
npm run dev

# Server will start on http://localhost:3000
```

### Production Mode
```bash
# Start in production mode
npm start

# Or run as background service (Linux/macOS)
nohup npm start > vpn-server.log 2>&1 &
```

### System Service Setup (Linux)

#### Create systemd service
```bash
# Create service file
sudo tee /etc/systemd/system/family-vpn.service > /dev/null <<EOF
[Unit]
Description=Family VPN Server
After=network.target

[Service]
Type=simple
User=vpnuser
WorkingDirectory=/path/to/family-vpn-server
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Create VPN user
sudo useradd -r -s /bin/false vpnuser
sudo chown -R vpnuser:vpnuser /path/to/family-vpn-server

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable family-vpn
sudo systemctl start family-vpn

# Check status
sudo systemctl status family-vpn
```

## Step 9: Verify Installation

### Check Service Status
```bash
# Test web interface
curl -k http://localhost:3000/health

# Check OpenVPN process
ps aux | grep openvpn

# Check listening ports
netstat -tulnp | grep -E '(1194|3000)'
```

### Access Web Interface
1. **Open browser** and navigate to `http://localhost:3000`
2. **Login** with the admin credentials you created
3. **Verify** the management interface loads correctly

### Test Certificate Generation
```bash
# Generate a test client certificate
npm run generate-client

# Follow prompts to create test certificate
# Verify .ovpn file is created in certificates directory
```

## Step 10: Generate Client Certificates

### Using Web Interface
1. **Access** `http://localhost:3000`
2. **Login** with admin credentials
3. **Click "Generate New Certificate"**
4. **Enter client name** (e.g., "john-laptop")
5. **Download .ovpn file**

### Using Command Line
```bash
# Generate client certificate interactively
npm run generate-client

# Or generate with specific name
CLIENT_NAME="mary-phone" npm run generate-client
```

## Configuration Files

### Main Configuration (.env)
```env
# Server Configuration
VPN_HOST=YOUR_SERVER_IP
VPN_PORT=1194
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Web Interface
API_PORT=3000
NODE_ENV=production

# Authentication
VPN_USERNAME=admin
VPN_PASSWORD_HASH=generated_hash_here
JWT_SECRET=generated_secret_here
SESSION_SECRET=generated_secret_here

# Paths (set by setup wizard)
VPN_CONFIG_DIR=/path/to/config
VPN_CERT_DIR=/path/to/certificates

# Security
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=900000
ENFORCE_IP_VALIDATION=false

# Logging
LOG_LEVEL=info
```

### OpenVPN Configuration
The setup wizard creates a hardened OpenVPN configuration at:
- **System**: `/etc/openvpn/openvpn.conf`
- **User**: `~/.privatevpn/config/openvpn.conf`

Key security features:
- AES-256-GCM encryption
- SHA-256 authentication
- Perfect Forward Secrecy
- TLS-Auth protection
- Strong DH parameters

## Troubleshooting

### Common Issues

#### "Permission denied" when starting
```bash
# Check file permissions
ls -la /path/to/certificates/

# Fix permissions if needed
sudo chown -R $USER:$USER /path/to/family-vpn-server
chmod 600 certificates/*.key
chmod 644 certificates/*.crt
```

#### "OpenVPN not found"
```bash
# Check OpenVPN installation
which openvpn
openvpn --version

# Install if missing (see Step 1)
```

#### "Port already in use"
```bash
# Check what's using the port
sudo netstat -tulnp | grep 3000

# Kill conflicting process or change port in .env
```

#### "Can't bind to VPN port"
```bash
# Check if port 1194 is available
sudo netstat -ulnp | grep 1194

# Run with sudo if using privileged port
sudo npm start
```

### Debug Mode
```bash
# Run with debug logging
DEBUG=* LOG_LEVEL=debug npm start

# Check logs
tail -f logs/application.log
tail -f logs/error.log
```

### Log Locations
- **Application logs**: `logs/application.log`
- **Error logs**: `logs/error.log`
- **Security logs**: `logs/security.log`
- **OpenVPN logs**: `/var/log/openvpn/` (system) or `logs/openvpn.log` (user)

## Maintenance

### Regular Tasks
```bash
# Update dependencies
npm update

# Backup certificates
npm run backup:create

# Check security
npm run security-scan

# Update system packages
sudo apt update && sudo apt upgrade  # Linux
brew upgrade  # macOS
```

### Certificate Management
```bash
# List certificates
ls -la certificates/

# Revoke certificate
npm run revoke-client CLIENT_NAME

# Renew server certificate
npm run fix-server-cert
```

## Next Steps

After successful local installation:

1. **[Environment Configuration](../configuration/environment.md)**
2. **[Security Configuration](../configuration/security.md)**
3. **[Network Configuration](../configuration/networking.md)**
4. **[Certificate Management](../configuration/certificates.md)**

## Performance Optimization

### System Tuning
```bash
# Increase file descriptor limits
echo '* soft nofile 65536' | sudo tee -a /etc/security/limits.conf
echo '* hard nofile 65536' | sudo tee -a /etc/security/limits.conf

# Optimize network parameters
echo 'net.core.rmem_max = 134217728' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max = 134217728' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### OpenVPN Optimization
```bash
# Edit OpenVPN config for better performance
# Add to openvpn.conf:
# fast-io
# sndbuf 393216
# rcvbuf 393216
```

This completes the local installation guide. The server should now be running and ready to accept VPN connections.