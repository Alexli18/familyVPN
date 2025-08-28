# Linux Troubleshooting

This guide covers Linux-specific issues and solutions for the Family VPN Server.

## Distribution-Specific Issues

### Ubuntu/Debian Issues

**Package Management:**

```bash
# Update package lists
sudo apt update

# Install missing dependencies
sudo apt install -y openvpn easy-rsa nodejs npm

# Fix broken packages
sudo apt --fix-broken install

# Check for held packages
apt-mark showhold
```

**Service Management:**

```bash
# Check OpenVPN service status
sudo systemctl status openvpn@server

# Enable OpenVPN service
sudo systemctl enable openvpn@server

# Check service logs
sudo journalctl -u openvpn@server -f

# Restart networking
sudo systemctl restart networking
```

### CentOS/RHEL/Fedora Issues

**Package Management:**

```bash
# Install EPEL repository (CentOS/RHEL)
sudo yum install -y epel-release

# Install dependencies
sudo yum install -y openvpn easy-rsa nodejs npm

# Or for newer versions:
sudo dnf install -y openvpn easy-rsa nodejs npm

# Check for package conflicts
sudo yum check
```

**Firewall Configuration:**

```bash
# Check firewalld status
sudo firewall-cmd --state

# Open VPN ports
sudo firewall-cmd --permanent --add-port=1194/udp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Check active zones
sudo firewall-cmd --get-active-zones

# List all rules
sudo firewall-cmd --list-all
```

### Arch Linux Issues

**Package Management:**

```bash
# Update system
sudo pacman -Syu

# Install dependencies
sudo pacman -S openvpn easy-rsa nodejs npm

# Install from AUR (if needed)
yay -S easy-rsa-git  # if using yay
```

## Network Configuration Issues

### IP Forwarding

**Symptoms:**
- VPN clients can connect but cannot access internet
- No traffic routing through VPN

**Solutions:**

```bash
# Check current IP forwarding status
cat /proc/sys/net/ipv4/ip_forward
sysctl net.ipv4.ip_forward

# Enable IP forwarding temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Enable IP forwarding permanently
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verify the change
sysctl net.ipv4.ip_forward
```

### Firewall Configuration

**iptables Issues:**

```bash
# Check current iptables rules
sudo iptables -L -n -v
sudo iptables -t nat -L -n -v

# Save current rules (Ubuntu/Debian)
sudo iptables-save > /tmp/iptables-backup.rules

# Restore rules (Ubuntu/Debian)
sudo iptables-restore < /tmp/iptables-backup.rules

# Make rules persistent (Ubuntu/Debian)
sudo apt install iptables-persistent
sudo netfilter-persistent save

# Make rules persistent (CentOS/RHEL)
sudo service iptables save
```

**UFW Issues (Ubuntu):**

```bash
# Check UFW status
sudo ufw status verbose

# Enable UFW
sudo ufw enable

# Allow VPN traffic
sudo ufw allow 1194/udp
sudo ufw allow 3000/tcp

# Allow forwarding
sudo ufw route allow in on tun0 out on eth0
sudo ufw route allow in on eth0 out on tun0

# Edit UFW configuration for NAT
sudo nano /etc/ufw/before.rules
# Add before *filter:
# *nat
# :POSTROUTING ACCEPT [0:0]
# -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
# COMMIT
```

### Network Interface Issues

**TUN Interface Problems:**

```bash
# Check if TUN module is loaded
lsmod | grep tun

# Load TUN module
sudo modprobe tun

# Make TUN module load at boot
echo 'tun' | sudo tee -a /etc/modules

# Check TUN device permissions
ls -la /dev/net/tun
# Should show: crw-rw-rw- 1 root root 10, 200

# Create TUN device if missing
sudo mkdir -p /dev/net
sudo mknod /dev/net/tun c 10 200
sudo chmod 666 /dev/net/tun
```

**Network Manager Conflicts:**

```bash
# Check NetworkManager status
sudo systemctl status NetworkManager

# Exclude VPN interface from NetworkManager
sudo nano /etc/NetworkManager/NetworkManager.conf
# Add under [main]:
# plugins=keyfile
# [keyfile]
# unmanaged-devices=interface-name:tun0

# Restart NetworkManager
sudo systemctl restart NetworkManager
```

## System Service Issues

### Systemd Service Problems

**Service Configuration:**

```bash
# Create systemd service for VPN server
sudo nano /etc/systemd/system/family-vpn.service

# Service file content:
[Unit]
Description=Family VPN Server
After=network.target

[Service]
Type=simple
User=vpn-user
WorkingDirectory=/path/to/vpn/server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable family-vpn
sudo systemctl start family-vpn
```

**Service Debugging:**

```bash
# Check service status
sudo systemctl status family-vpn

# View service logs
sudo journalctl -u family-vpn -f

# Check service dependencies
systemctl list-dependencies family-vpn

# Debug service startup
sudo systemctl --debug start family-vpn
```

### OpenVPN Service Issues

**Configuration Problems:**

```bash
# Test OpenVPN configuration
sudo openvpn --config /etc/openvpn/server.conf --test-crypto

# Check OpenVPN logs
sudo tail -f /var/log/openvpn/server.log

# Start OpenVPN manually for debugging
sudo openvpn --config /etc/openvpn/server.conf --verb 6

# Check OpenVPN service status
sudo systemctl status openvpn@server
```

## File System and Permissions

### Permission Issues

**Certificate File Permissions:**

```bash
# Check current permissions
ls -la easy-rsa/pki/private/
ls -la certificates/

# Fix PKI permissions
sudo chown -R $USER:$USER easy-rsa/
chmod -R 755 easy-rsa/
chmod 600 easy-rsa/pki/private/*
chmod 644 easy-rsa/pki/*.crt

# Fix certificate permissions
sudo chown -R $USER:$USER certificates/
chmod 755 certificates/
chmod 644 certificates/*.crt certificates/*.conf
chmod 600 certificates/*.key
```

**SELinux Issues (CentOS/RHEL/Fedora):**

```bash
# Check SELinux status
getenforce
sestatus

# Check SELinux contexts
ls -Z easy-rsa/pki/
ls -Z certificates/

# Set correct SELinux contexts
sudo setsebool -P openvpn_can_network_connect 1
sudo setsebool -P openvpn_run_unconfined 1

# Restore default contexts
sudo restorecon -R easy-rsa/
sudo restorecon -R certificates/

# Create custom SELinux policy if needed
sudo audit2allow -a -M vpn-server
sudo semodule -i vpn-server.pp

# Temporarily disable SELinux for testing
sudo setenforce 0
# Re-enable after testing
sudo setenforce 1
```

### Disk Space Issues

**Log File Management:**

```bash
# Check disk usage
df -h
du -sh logs/

# Clean up old logs
find logs/ -name "*.log" -mtime +30 -delete

# Set up log rotation
sudo nano /etc/logrotate.d/family-vpn

# Logrotate configuration:
/path/to/vpn/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}

# Test log rotation
sudo logrotate -d /etc/logrotate.d/family-vpn
```

## Process and Resource Management

### Memory Issues

**Out of Memory Problems:**

```bash
# Check memory usage
free -h
cat /proc/meminfo

# Check for memory-intensive processes
ps aux --sort=-%mem | head -10

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full node server.js

# Add swap space if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### CPU Issues

**High CPU Usage:**

```bash
# Monitor CPU usage
top
htop  # if available

# Check CPU-intensive processes
ps aux --sort=-%cpu | head -10

# Monitor system load
uptime
cat /proc/loadavg

# Check for runaway processes
ps aux | grep -E "(node|openvpn)" | grep -v grep

# Limit process CPU usage
cpulimit -p $(pgrep -f "node.*server.js") -l 50
```

## Security Issues

### User and Group Management

**Service User Setup:**

```bash
# Create dedicated VPN user
sudo useradd -r -s /bin/false vpn-user
sudo usermod -a -G vpn-user $USER

# Set up proper ownership
sudo chown -R vpn-user:vpn-user /path/to/vpn/
sudo chmod -R 755 /path/to/vpn/
sudo chmod 600 /path/to/vpn/easy-rsa/pki/private/*
```

### SSH and Remote Access

**SSH Configuration for VPN Management:**

```bash
# Secure SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# Port 2222  # Change default port
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# AllowUsers vpn-admin

# Restart SSH service
sudo systemctl restart sshd

# Set up SSH key authentication
ssh-keygen -t rsa -b 4096 -C "vpn-admin@server"
ssh-copy-id -p 2222 vpn-admin@server-ip
```

## Monitoring and Logging

### System Monitoring Setup

**Install Monitoring Tools:**

```bash
# Ubuntu/Debian
sudo apt install -y htop iotop iftop nethogs sysstat

# CentOS/RHEL
sudo yum install -y htop iotop iftop nethogs sysstat

# Enable system statistics
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

**Log Monitoring:**

```bash
# Monitor system logs
sudo tail -f /var/log/syslog  # Ubuntu/Debian
sudo tail -f /var/log/messages  # CentOS/RHEL

# Monitor authentication logs
sudo tail -f /var/log/auth.log  # Ubuntu/Debian
sudo tail -f /var/log/secure  # CentOS/RHEL

# Monitor kernel messages
dmesg -w
```

## Linux Troubleshooting Checklist

### System Health Check
- [ ] Check system resources: `free -h`, `df -h`, `uptime`
- [ ] Verify services: `systemctl status family-vpn openvpn@server`
- [ ] Check network: `ip addr show`, `ip route`
- [ ] Review logs: `journalctl -xe`, `tail -f /var/log/syslog`

### Network Configuration
- [ ] Verify IP forwarding: `sysctl net.ipv4.ip_forward`
- [ ] Check firewall rules: `iptables -L -n`, `ufw status`
- [ ] Test TUN interface: `ls -la /dev/net/tun`
- [ ] Verify routing: `ip route show`

### File Permissions
- [ ] Check PKI permissions: `ls -la easy-rsa/pki/private/`
- [ ] Verify certificate ownership: `ls -la certificates/`
- [ ] Check SELinux contexts: `ls -Z` (if applicable)
- [ ] Test file access: `sudo -u vpn-user ls certificates/`

### Service Configuration
- [ ] Validate OpenVPN config: `openvpn --test-crypto`
- [ ] Check systemd services: `systemctl list-failed`
- [ ] Verify environment variables: `systemctl show-environment`
- [ ] Test service startup: `systemctl --debug start family-vpn`

### Security Verification
- [ ] Check running processes: `ps aux | grep -E "(node|openvpn)"`
- [ ] Verify user permissions: `id vpn-user`
- [ ] Check SSH configuration: `sshd -T`
- [ ] Review security logs: `grep -i failed /var/log/auth.log`

Remember to always check distribution-specific documentation and consider the specific Linux distribution's conventions when troubleshooting issues.