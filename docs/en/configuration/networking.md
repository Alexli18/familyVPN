# Network Configuration

This guide covers network configuration for the Family VPN Server, including VPN networking, routing, firewall setup, and performance optimization.

## Overview

Network configuration is crucial for proper VPN operation. This includes setting up the VPN subnet, configuring routing, managing firewall rules, and optimizing network performance.

## VPN Network Configuration

### Basic Network Settings

#### VPN Subnet Configuration
```env
# .env file network settings
VPN_SUBNET=10.8.0.0          # VPN network address
VPN_NETMASK=255.255.255.0    # Network mask (/24)
VPN_PORT=1194                # OpenVPN port (UDP)
VPN_PROTOCOL=udp             # Protocol (udp recommended)
```

#### Alternative Subnet Options
```env
# If 10.8.0.0/24 conflicts with local network
VPN_SUBNET=10.9.0.0          # Alternative subnet
VPN_SUBNET=172.16.0.0        # Private class B range
VPN_SUBNET=192.168.100.0     # Private class C range

# Larger networks (for more clients)
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.0.0      # /16 network (65,534 hosts)
```

#### Network Conflict Detection
```bash
# Check local network configuration
ip route show
route -n

# Check for conflicts
ping -c 1 10.8.0.1  # Should fail if no conflict

# Find available subnets
for i in {8..20}; do
  if ! ping -c 1 -W 1 10.$i.0.1 >/dev/null 2>&1; then
    echo "10.$i.0.0/24 appears available"
  fi
done
```

### OpenVPN Network Configuration

#### Basic OpenVPN Configuration
```conf
# /etc/openvpn/openvpn.conf or ~/.privatevpn/config/openvpn.conf

# Server mode and network
mode server
tls-server

# Network settings
port 1194
proto udp
dev tun

# VPN network
server 10.8.0.0 255.255.255.0

# Client configuration
ifconfig-pool-persist ipp.txt
client-config-dir ccd

# Routing
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 1.1.1.1"
push "dhcp-option DNS 1.0.0.1"

# Keep alive
keepalive 10 120

# Compression (optional, can reduce performance)
compress lz4-v2
push "compress lz4-v2"
```

#### Advanced Network Settings
```conf
# Advanced OpenVPN network configuration

# Multiple DNS servers
push "dhcp-option DNS 1.1.1.1"
push "dhcp-option DNS 1.0.0.1"
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"

# Custom routes (don't route everything through VPN)
# push "route 192.168.1.0 255.255.255.0"

# Client-to-client communication
client-to-client

# Duplicate CN (allow same certificate on multiple devices)
# duplicate-cn  # Not recommended for security

# Maximum clients
max-clients 50

# Client idle timeout
inactive 3600  # Disconnect idle clients after 1 hour
```

### DNS Configuration

#### DNS Server Options
```conf
# Secure DNS providers
push "dhcp-option DNS 1.1.1.1"      # Cloudflare
push "dhcp-option DNS 1.0.0.1"      # Cloudflare secondary
push "dhcp-option DNS 8.8.8.8"      # Google
push "dhcp-option DNS 8.8.4.4"      # Google secondary
push "dhcp-option DNS 9.9.9.9"      # Quad9
push "dhcp-option DNS 149.112.112.112"  # Quad9 secondary

# Local DNS (if running local DNS server)
push "dhcp-option DNS 192.168.1.1"  # Router/local DNS
```

#### DNS Leak Prevention
```conf
# Prevent DNS leaks
push "dhcp-option DNS 1.1.1.1"
push "dhcp-option DNS 1.0.0.1"
push "block-outside-dns"  # Windows only

# Alternative: use redirect-gateway
push "redirect-gateway def1 bypass-dhcp"
```

#### Custom DNS Configuration
```bash
# Set up local DNS server (optional)
sudo apt install dnsmasq

# Configure dnsmasq
echo "listen-address=10.8.0.1" | sudo tee -a /etc/dnsmasq.conf
echo "server=1.1.1.1" | sudo tee -a /etc/dnsmasq.conf
echo "server=1.0.0.1" | sudo tee -a /etc/dnsmasq.conf

# Restart dnsmasq
sudo systemctl restart dnsmasq

# Use local DNS in OpenVPN
push "dhcp-option DNS 10.8.0.1"
```

## Routing Configuration

### IP Forwarding

#### Enable IP Forwarding
```bash
# Temporary (until reboot)
sudo sysctl -w net.ipv4.ip_forward=1

# Permanent
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verify
cat /proc/sys/net/ipv4/ip_forward  # Should output 1
```

#### IPv6 Forwarding (if needed)
```bash
# Enable IPv6 forwarding
echo 'net.ipv6.conf.all.forwarding=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### NAT Configuration

#### Basic NAT Setup
```bash
# Add NAT rule for VPN traffic
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

# Make permanent (Ubuntu/Debian)
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# For other interfaces, replace eth0 with your interface
ip route | grep default  # Find your default interface
```

#### Advanced NAT Configuration
```bash
# NAT with specific source IP
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j SNAT --to-source YOUR_SERVER_IP

# NAT for multiple subnets
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/16 -o eth0 -j MASQUERADE

# NAT with port restrictions
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -p tcp --dport 80,443 -o eth0 -j MASQUERADE
```

### Custom Routing

#### Split Tunneling Configuration
```conf
# OpenVPN split tunneling (route only specific traffic through VPN)

# Don't redirect all traffic
# push "redirect-gateway def1 bypass-dhcp"

# Route specific networks through VPN
push "route 192.168.1.0 255.255.255.0"    # Local network
push "route 10.0.0.0 255.0.0.0"           # Private networks
push "route 172.16.0.0 255.240.0.0"       # Private networks

# Route specific websites/services
push "route 1.1.1.1 255.255.255.255"      # Cloudflare DNS
```

#### Client-Specific Routing
```bash
# Create client config directory
mkdir -p /etc/openvpn/ccd

# Create client-specific config
cat > /etc/openvpn/ccd/client-name << EOF
# Assign specific IP to client
ifconfig-push 10.8.0.100 10.8.0.101

# Client-specific routes
push "route 192.168.2.0 255.255.255.0"

# Client-specific DNS
push "dhcp-option DNS 192.168.1.1"
EOF
```

## Firewall Configuration

### UFW (Ubuntu Firewall)

#### Basic UFW Setup
```bash
# Reset firewall
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow OpenVPN
sudo ufw allow 1194/udp

# Allow web interface (restrict to admin IPs)
sudo ufw allow from YOUR_ADMIN_IP to any port 3000

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### Advanced UFW Rules
```bash
# Allow specific IP ranges
sudo ufw allow from 192.168.1.0/24 to any port 3000

# Allow multiple admin IPs
sudo ufw allow from 203.0.113.10 to any port 3000
sudo ufw allow from 203.0.113.20 to any port 3000

# Rate limiting
sudo ufw limit ssh
sudo ufw limit 1194/udp

# Logging
sudo ufw logging on
```

### iptables Configuration

#### Complete iptables Setup
```bash
#!/bin/bash
# Comprehensive iptables configuration for VPN server

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established and related connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (adjust port if needed)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow OpenVPN
iptables -A INPUT -p udp --dport 1194 -j ACCEPT

# Allow web interface from admin IPs only
iptables -A INPUT -p tcp --dport 3000 -s YOUR_ADMIN_IP -j ACCEPT

# Allow VPN clients to access internet
iptables -A FORWARD -s 10.8.0.0/24 -j ACCEPT

# NAT for VPN clients
iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

# Allow VPN clients to access local network (optional)
# iptables -A FORWARD -s 10.8.0.0/24 -d 192.168.1.0/24 -j ACCEPT
# iptables -A FORWARD -s 192.168.1.0/24 -d 10.8.0.0/24 -j ACCEPT

# Drop invalid packets
iptables -A INPUT -m state --state INVALID -j DROP
iptables -A FORWARD -m state --state INVALID -j DROP

# Rate limiting for OpenVPN (prevent DoS)
iptables -A INPUT -p udp --dport 1194 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT

# Log dropped packets (optional)
# iptables -A INPUT -j LOG --log-prefix "INPUT DROP: "
# iptables -A FORWARD -j LOG --log-prefix "FORWARD DROP: "

# Save rules
iptables-save > /etc/iptables/rules.v4
```

#### Firewall Automation Script
```bash
#!/bin/bash
# scripts/setup-firewall.sh

VPN_SUBNET=${VPN_SUBNET:-"10.8.0.0/24"}
VPN_PORT=${VPN_PORT:-1194}
API_PORT=${API_PORT:-3000}
ADMIN_IP=${ADMIN_IP:-""}

echo "Setting up firewall for VPN server..."

# Check if UFW is available
if command -v ufw >/dev/null 2>&1; then
    echo "Using UFW..."
    
    # Reset and configure UFW
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow OpenVPN
    sudo ufw allow $VPN_PORT/udp
    
    # Allow web interface
    if [ -n "$ADMIN_IP" ]; then
        sudo ufw allow from $ADMIN_IP to any port $API_PORT
    else
        echo "Warning: No admin IP specified, allowing web interface from anywhere"
        sudo ufw allow $API_PORT
    fi
    
    # Enable firewall
    sudo ufw enable
    
else
    echo "Using iptables..."
    # Use iptables configuration from above
fi

echo "Firewall configuration completed"
```

## Performance Optimization

### Network Performance Tuning

#### System Network Optimization
```bash
# Increase network buffer sizes
echo 'net.core.rmem_max = 134217728' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max = 134217728' | sudo tee -a /etc/sysctl.conf
echo 'net.core.netdev_max_backlog = 5000' | sudo tee -a /etc/sysctl.conf

# TCP optimization
echo 'net.ipv4.tcp_congestion_control = bbr' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_rmem = 4096 87380 134217728' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_wmem = 4096 65536 134217728' | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

#### OpenVPN Performance Optimization
```conf
# OpenVPN performance settings

# Use fast I/O
fast-io

# Increase buffer sizes
sndbuf 393216
rcvbuf 393216

# Optimize for throughput
tcp-nodelay

# Reduce CPU usage (disable compression if not needed)
# compress lz4-v2

# Use multiple threads (OpenVPN 2.4+)
# management localhost 7505

# Optimize TLS
tls-timeout 2
tls-retry 2
connect-timeout 10
connect-retry-max 3
```

### Bandwidth Management

#### Traffic Shaping (Optional)
```bash
# Install traffic control tools
sudo apt install iproute2

# Limit bandwidth per client (example: 10 Mbps)
sudo tc qdisc add dev tun0 root handle 1: htb default 30
sudo tc class add dev tun0 parent 1: classid 1:1 htb rate 100mbit
sudo tc class add dev tun0 parent 1:1 classid 1:10 htb rate 10mbit ceil 10mbit

# Apply to VPN clients
sudo tc filter add dev tun0 protocol ip parent 1:0 prio 1 u32 match ip src 10.8.0.0/24 flowid 1:10
```

#### Connection Limits
```conf
# OpenVPN connection limits
max-clients 50
connect-freq 1 10  # Max 1 connection per 10 seconds per IP

# Client timeout settings
ping 10
ping-restart 120
ping-timer-rem
persist-tun
persist-key
```

## Network Monitoring

### Connection Monitoring

#### Monitor Active Connections
```bash
# Check OpenVPN status
sudo systemctl status openvpn@server

# View connected clients
cat /var/log/openvpn/openvpn-status.log

# Monitor network traffic
sudo netstat -i
sudo iftop -i tun0

# Check VPN interface
ip addr show tun0
```

#### Network Statistics Script
```bash
#!/bin/bash
# scripts/network-stats.sh

echo "=== VPN Server Network Statistics ==="
echo

echo "OpenVPN Status:"
if pgrep openvpn >/dev/null; then
    echo "✅ OpenVPN is running"
else
    echo "❌ OpenVPN is not running"
fi

echo
echo "Network Interfaces:"
ip addr show | grep -E "(tun0|eth0|wlan0)" -A 2

echo
echo "Connected VPN Clients:"
if [ -f /var/log/openvpn/openvpn-status.log ]; then
    grep "CLIENT_LIST" /var/log/openvpn/openvpn-status.log | wc -l
else
    echo "Status log not found"
fi

echo
echo "Network Traffic (tun0):"
if ip link show tun0 >/dev/null 2>&1; then
    cat /proc/net/dev | grep tun0
else
    echo "TUN interface not found"
fi

echo
echo "Firewall Status:"
if command -v ufw >/dev/null; then
    sudo ufw status
else
    echo "UFW not installed"
fi
```

### Network Diagnostics

#### Connectivity Testing
```bash
# Test VPN server connectivity
ping -c 4 YOUR_VPN_SERVER_IP

# Test VPN port
nmap -sU -p 1194 YOUR_VPN_SERVER_IP

# Test from VPN client
ping -c 4 10.8.0.1  # VPN gateway
ping -c 4 8.8.8.8   # Internet connectivity
nslookup google.com  # DNS resolution
```

#### Network Troubleshooting
```bash
# Check routing table
ip route show

# Check NAT rules
sudo iptables -t nat -L -n -v

# Check if IP forwarding is enabled
cat /proc/sys/net/ipv4/ip_forward

# Test DNS resolution
dig @1.1.1.1 google.com
nslookup google.com 1.1.1.1

# Check for IP conflicts
arping -I eth0 10.8.0.1
```

## Cloud Platform Networking

### AWS Networking

#### Security Group Configuration
```bash
# AWS CLI commands for security group setup

# Create security group
aws ec2 create-security-group \
    --group-name vpn-server-sg \
    --description "VPN Server Security Group"

# Allow OpenVPN traffic
aws ec2 authorize-security-group-ingress \
    --group-name vpn-server-sg \
    --protocol udp \
    --port 1194 \
    --cidr 0.0.0.0/0

# Allow management interface (restrict to your IP)
aws ec2 authorize-security-group-ingress \
    --group-name vpn-server-sg \
    --protocol tcp \
    --port 3000 \
    --cidr YOUR_IP/32

# Allow SSH
aws ec2 authorize-security-group-ingress \
    --group-name vpn-server-sg \
    --protocol tcp \
    --port 22 \
    --cidr YOUR_IP/32
```

### Google Cloud Networking

#### Firewall Rules
```bash
# Create firewall rules for GCP

# Allow OpenVPN
gcloud compute firewall-rules create allow-openvpn \
    --allow udp:1194 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow OpenVPN traffic"

# Allow management interface
gcloud compute firewall-rules create allow-vpn-management \
    --allow tcp:3000 \
    --source-ranges YOUR_IP/32 \
    --description "Allow VPN management interface"

# Allow SSH
gcloud compute firewall-rules create allow-ssh \
    --allow tcp:22 \
    --source-ranges YOUR_IP/32 \
    --description "Allow SSH access"
```

## Troubleshooting Network Issues

### Common Network Problems

#### VPN Clients Can't Connect
```bash
# Check if OpenVPN is listening
sudo netstat -ulnp | grep 1194

# Check firewall
sudo ufw status
sudo iptables -L -n | grep 1194

# Check OpenVPN logs
sudo tail -f /var/log/openvpn/openvpn.log

# Test port accessibility
nmap -sU -p 1194 localhost
```

#### No Internet Access Through VPN
```bash
# Check IP forwarding
cat /proc/sys/net/ipv4/ip_forward

# Check NAT rules
sudo iptables -t nat -L -n -v

# Check routing
ip route show

# Test DNS
dig @8.8.8.8 google.com
```

#### DNS Issues
```bash
# Check DNS configuration in OpenVPN
grep "push.*DNS" /etc/openvpn/openvpn.conf

# Test DNS servers
nslookup google.com 1.1.1.1
dig @1.0.0.1 google.com

# Check for DNS leaks
curl https://1.1.1.1/cdn-cgi/trace
```

#### Performance Issues
```bash
# Check network interface statistics
cat /proc/net/dev

# Monitor bandwidth usage
iftop -i tun0

# Check system resources
top
iostat 1

# Test network speed
speedtest-cli
```

### Network Debugging

#### Debug Mode
```bash
# Run OpenVPN in debug mode
sudo openvpn --config /etc/openvpn/openvpn.conf --verb 6

# Enable packet capture
sudo tcpdump -i tun0 -n

# Monitor connections
sudo ss -tuln | grep -E "(1194|3000)"
```

#### Log Analysis
```bash
# Analyze OpenVPN logs
sudo tail -f /var/log/openvpn/openvpn.log | grep -E "(ERROR|WARNING)"

# Check system logs
sudo journalctl -u openvpn@server -f

# Monitor firewall logs
sudo tail -f /var/log/ufw.log
```

## Next Steps

After configuring networking:

1. **[Certificate Configuration](certificates.md)** - Set up PKI and certificates
2. **[Security Hardening](security.md#firewall-configuration)** - Advanced security settings
3. **[Performance Monitoring](../troubleshooting/performance.md)** - Monitor and optimize performance