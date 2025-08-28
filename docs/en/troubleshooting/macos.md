# macOS Troubleshooting

This guide covers macOS-specific issues and solutions for the Family VPN Server.

## macOS-Specific Issues

### Homebrew Dependencies

**Installation Issues:**

```bash
# Check Homebrew installation
brew --version

# Install Homebrew if missing
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Update Homebrew
brew update

# Install OpenVPN and dependencies
brew install openvpn easy-rsa node

# Check installed packages
brew list | grep -E "(openvpn|easy-rsa|node)"

# Fix broken installations
brew doctor
brew cleanup
```

**Path Issues:**

```bash
# Check PATH configuration
echo $PATH

# Add Homebrew to PATH (if missing)
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# For Intel Macs:
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc

# Verify OpenVPN location
which openvpn
ls -la $(which openvpn)
```

### System Integrity Protection (SIP)

**TUN/TAP Interface Issues:**

```bash
# Check SIP status
csrutil status

# Install TUN/TAP driver (if needed)
# Download from: https://tunnelblick.net/tun-tap.html
# Or use Homebrew:
brew install --cask tuntap

# Verify TUN device
ls -la /dev/tun*

# Check kernel extensions
kextstat | grep tun
```

**Permission Issues with SIP:**

```bash
# Check system extension status
systemextensionsctl list

# For newer macOS versions, use system extensions
# Install Tunnelblick for TUN/TAP support
brew install --cask tunnelblick

# Alternative: Use built-in VPN client
# Configure as IKEv2 or L2TP instead of OpenVPN
```

### Network Configuration

**Network Interface Management:**

```bash
# List network interfaces
ifconfig
networksetup -listallhardwareports

# Check routing table
netstat -rn
route -n get default

# Check DNS configuration
scutil --dns
cat /etc/resolv.conf

# Flush DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Firewall Configuration:**

```bash
# Check macOS firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Enable firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Allow Node.js through firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node

# Check pfctl rules (advanced)
sudo pfctl -sr
sudo pfctl -sn
```

## Service Management

### LaunchDaemons and LaunchAgents

**Create Launch Daemon for VPN Server:**

```bash
# Create launch daemon plist
sudo nano /Library/LaunchDaemons/com.family.vpn.plist

# Plist content:
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.family.vpn</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/vpn/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/vpn</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/path/to/vpn/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/path/to/vpn/logs/stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
</dict>
</plist>

# Load the daemon
sudo launchctl load /Library/LaunchDaemons/com.family.vpn.plist

# Start the service
sudo launchctl start com.family.vpn

# Check service status
sudo launchctl list | grep com.family.vpn
```

**OpenVPN Service Management:**

```bash
# Create OpenVPN launch daemon
sudo nano /Library/LaunchDaemons/org.openvpn.server.plist

# Load OpenVPN service
sudo launchctl load /Library/LaunchDaemons/org.openvpn.server.plist

# Check OpenVPN status
sudo launchctl list | grep openvpn

# View service logs
tail -f /var/log/openvpn.log
```

### Process Management

**Managing Background Processes:**

```bash
# Find VPN-related processes
ps aux | grep -E "(node|openvpn)" | grep -v grep

# Kill processes gracefully
pkill -TERM -f "node.*server.js"
sudo pkill -TERM openvpn

# Force kill if necessary
pkill -KILL -f "node.*server.js"
sudo pkill -KILL openvpn

# Monitor process resources
top -pid $(pgrep -f "node.*server.js")
```

## File System and Permissions

### macOS File Permissions

**Certificate File Permissions:**

```bash
# Check file permissions
ls -la@ easy-rsa/pki/private/
ls -la@ certificates/

# Remove extended attributes if present
xattr -c easy-rsa/pki/private/*
xattr -c certificates/*

# Set correct permissions
chmod 700 easy-rsa/pki/private/
chmod 600 easy-rsa/pki/private/*
chmod 644 easy-rsa/pki/*.crt
chmod 644 certificates/*.crt certificates/*.conf
chmod 600 certificates/*.key

# Check for quarantine attributes
xattr -l certificates/*
# Remove quarantine if present
xattr -d com.apple.quarantine certificates/*
```

**Gatekeeper Issues:**

```bash
# Check Gatekeeper status
spctl --status

# Allow unsigned applications (temporary)
sudo spctl --master-disable

# Re-enable Gatekeeper
sudo spctl --master-enable

# Allow specific application
sudo spctl --add /usr/local/bin/node
sudo spctl --enable /usr/local/bin/node
```

### Keychain and Certificate Management

**System Keychain Integration:**

```bash
# Import CA certificate to system keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain easy-rsa/pki/ca.crt

# List certificates in keychain
security find-certificate -a -p /Library/Keychains/System.keychain | grep -B1 -A1 "Family VPN"

# Remove certificate from keychain
sudo security delete-certificate -c "Family VPN CA" /Library/Keychains/System.keychain
```

## Network Troubleshooting

### Network Connectivity Issues

**DNS Resolution Problems:**

```bash
# Check DNS servers
scutil --dns | grep nameserver

# Test DNS resolution
nslookup google.com
dig google.com

# Check mDNS resolution
dns-sd -q google.com

# Reset network configuration
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
sudo networksetup -setdnsservers "Wi-Fi" 8.8.8.8 8.8.4.4
```

**Routing Issues:**

```bash
# Check default route
route -n get default

# Add static route (if needed)
sudo route add -net 10.8.0.0/24 -interface tun0

# Delete route
sudo route delete -net 10.8.0.0/24

# Check route table
netstat -rn | grep tun
```

**Network Interface Problems:**

```bash
# Check network interfaces
ifconfig -a
networksetup -listallhardwareports

# Reset network interface
sudo ifconfig en0 down
sudo ifconfig en0 up

# Renew DHCP lease
sudo ipconfig set en0 DHCP

# Check network service order
networksetup -listnetworkserviceorder
```

## Security and Privacy

### Privacy Settings

**Network Access Permissions:**

```bash
# Check network access permissions
# System Preferences > Security & Privacy > Privacy > Full Disk Access
# Add Terminal.app and Node.js if needed

# Check accessibility permissions
# System Preferences > Security & Privacy > Privacy > Accessibility
```

**Firewall Configuration:**

```bash
# Enable application firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Set firewall to stealth mode
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on

# Allow signed applications
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setallowsigned on

# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

### Code Signing Issues

**Unsigned Binary Problems:**

```bash
# Check code signature
codesign -dv /usr/local/bin/node
codesign -dv /usr/local/bin/openvpn

# Sign binary (if you have developer certificate)
codesign -s "Developer ID Application: Your Name" /path/to/binary

# Remove quarantine attribute
xattr -d com.apple.quarantine /path/to/binary

# Allow execution in Gatekeeper
sudo spctl --add /path/to/binary
```

## Performance Optimization

### System Performance

**Resource Monitoring:**

```bash
# Monitor system resources
top -o cpu
top -o mem

# Check system activity
sudo fs_usage | grep -E "(node|openvpn)"
sudo dtrace -n 'syscall:::entry /execname == "node"/ { @[probefunc] = count(); }'

# Monitor network activity
nettop -p $(pgrep -f "node.*server.js")
```

**Memory Management:**

```bash
# Check memory pressure
memory_pressure

# Monitor memory usage
vm_stat
sudo purge  # Free inactive memory

# Check swap usage
sysctl vm.swapusage
```

### Network Performance

**Network Optimization:**

```bash
# Check network buffer sizes
sysctl net.inet.tcp.sendspace
sysctl net.inet.tcp.recvspace

# Optimize network settings (if needed)
sudo sysctl -w net.inet.tcp.sendspace=65536
sudo sysctl -w net.inet.tcp.recvspace=65536

# Make changes permanent
echo "net.inet.tcp.sendspace=65536" | sudo tee -a /etc/sysctl.conf
echo "net.inet.tcp.recvspace=65536" | sudo tee -a /etc/sysctl.conf
```

## macOS Version-Specific Issues

### macOS Big Sur and Later

**System Extension Issues:**

```bash
# Check system extensions
systemextensionsctl list

# Reset system extensions (if needed)
sudo systemextensionsctl reset

# Install network extension for VPN
# Use Network Extension framework instead of TUN/TAP
```

### macOS Monterey and Later

**Network Privacy Changes:**

```bash
# Check network privacy settings
# System Preferences > Security & Privacy > Privacy > Local Network

# Allow network access for Node.js and OpenVPN applications
# Add applications to allowed list manually
```

## Troubleshooting Checklist for macOS

### Initial Diagnosis
- [ ] Check Homebrew installation: `brew --version`
- [ ] Verify OpenVPN installation: `which openvpn`
- [ ] Check Node.js version: `node --version`
- [ ] Test TUN/TAP availability: `ls -la /dev/tun*`

### Network Configuration
- [ ] Check network interfaces: `ifconfig -a`
- [ ] Verify routing table: `netstat -rn`
- [ ] Test DNS resolution: `nslookup google.com`
- [ ] Check firewall status: `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate`

### Service Management
- [ ] Check running processes: `ps aux | grep -E "(node|openvpn)"`
- [ ] Verify launch daemons: `sudo launchctl list | grep -E "(vpn|openvpn)"`
- [ ] Check service logs: `tail -f /var/log/system.log`
- [ ] Test service startup: `sudo launchctl start com.family.vpn`

### File Permissions
- [ ] Check certificate permissions: `ls -la@ certificates/`
- [ ] Verify extended attributes: `xattr -l certificates/*`
- [ ] Check Gatekeeper status: `spctl --status`
- [ ] Test file access: `cat certificates/ca.crt`

### Security Settings
- [ ] Check SIP status: `csrutil status`
- [ ] Verify privacy permissions: System Preferences > Security & Privacy
- [ ] Check code signatures: `codesign -dv /usr/local/bin/node`
- [ ] Test network access: `curl -I http://localhost:3000`

Remember that macOS has stricter security policies than Linux, so many issues are related to permissions, code signing, and system integrity protection. Always check System Preferences > Security & Privacy when troubleshooting access issues.