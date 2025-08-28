# Network Troubleshooting

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [Troubleshooting](README.md) > Network

🌐 **Language**: [English](../../en/troubleshooting/network.md) | [Русский](../../ru/troubleshooting/network.md)

This guide helps resolve network-related issues with the Family VPN Server.

## Common Network Issues

### VPN Connection Problems

#### Clients Cannot Connect to VPN Server

**Symptoms:**
- Connection timeout errors
- "Cannot resolve hostname" errors
- VPN client shows "connecting" but never connects

**Solutions:**

1. **Check Server Accessibility**
   ```bash
   # Test if VPN port is accessible
   nmap -sU -p 1194 YOUR_SERVER_IP
   
   # Test from client machine
   telnet YOUR_SERVER_IP 1194  # Won't work for UDP, but tests basic connectivity
   
   # Check if OpenVPN is listening
   sudo netstat -ulnp | grep 1194
   sudo ss -ulnp | grep 1194
   ```

2. **Verify Firewall Configuration**
   ```bash
   # Check UFW status
   sudo ufw status verbose
   
   # Check iptables rules
   sudo iptables -L -n | grep 1194
   
   # Test firewall rules
   sudo ufw allow 1194/udp
   ```

3. **Check OpenVPN Service Status**
   ```bash
   # Check service status
   sudo systemctl status openvpn@server
   
   # View OpenVPN logs
   sudo journalctl -u openvpn@server -f
   
   # Check OpenVPN configuration
   sudo openvpn --config /etc/openvpn/openvpn.conf --test-crypto
   ```

#### VPN Connects But No Internet Access

**Symptoms:**
- VPN connection established successfully
- Cannot browse internet through VPN
- DNS resolution failures

**Solutions:**

1. **Check IP Forwarding**
   ```bash
   # Verify IP forwarding is enabled
   cat /proc/sys/net/ipv4/ip_forward
   # Should output 1
   
   # Enable if disabled
   sudo sysctl -w net.ipv4.ip_forward=1
   
   # Make permanent
   echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Check NAT Configuration**
   ```bash
   # Verify NAT rules exist
   sudo iptables -t nat -L -n -v
   
   # Add NAT rule if missing
   sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
   
   # Save iptables rules
   sudo iptables-save | sudo tee /etc/iptables/rules.v4
   ```

3. **Test DNS Resolution**
   ```bash
   # Test DNS from VPN client
   nslookup google.com
   dig @8.8.8.8 google.com
   
   # Check DNS configuration in OpenVPN
   grep "push.*DNS" /etc/openvpn/openvpn.conf
   
   # Test DNS servers
   ping 8.8.8.8
   ping 1.1.1.1
   ```

### Network Configuration Issues

#### IP Address Conflicts

**Symptoms:**
- VPN clients get conflicting IP addresses
- Network connectivity issues
- "Address already in use" errors

**Solutions:**

1. **Check VPN Subnet Configuration**
   ```bash
   # Verify VPN subnet doesn't conflict with local network
   ip route show
   
   # Check current network configuration
   ifconfig
   ip addr show
   
   # Test for conflicts
   ping -c 1 10.8.0.1  # Should fail if no conflict
   ```

2. **Change VPN Subnet**
   ```env
   # In .env file - use different subnet
   VPN_SUBNET=10.9.0.0
   VPN_NETMASK=255.255.255.0
   ```

3. **Update OpenVPN Configuration**
   ```conf
   # In openvpn.conf - update server directive
   server 10.9.0.0 255.255.255.0
   ```

#### Routing Problems

**Symptoms:**
- Traffic not routing correctly
- Cannot reach specific networks
- Asymmetric routing issues

**Solutions:**

1. **Check Routing Table**
   ```bash
   # View current routes
   ip route show
   route -n
   
   # Check VPN routes
   ip route show | grep tun0
   
   # Test specific routes
   traceroute 8.8.8.8
   mtr google.com
   ```

2. **Fix Routing Configuration**
   ```bash
   # Add missing routes
   sudo ip route add 192.168.1.0/24 via 10.8.0.1 dev tun0
   
   # Check OpenVPN push routes
   grep "push.*route" /etc/openvpn/openvpn.conf
   ```

3. **Configure Split Tunneling**
   ```conf
   # In openvpn.conf - route specific networks only
   # Comment out: push "redirect-gateway def1 bypass-dhcp"
   
   # Add specific routes
   push "route 192.168.1.0 255.255.255.0"
   push "route 10.0.0.0 255.0.0.0"
   ```

### DNS Issues

#### DNS Resolution Failures

**Symptoms:**
- Cannot resolve domain names
- "Name resolution failed" errors
- Websites not loading despite internet connectivity

**Solutions:**

1. **Check DNS Configuration**
   ```bash
   # Test DNS resolution
   nslookup google.com
   dig google.com
   
   # Check system DNS
   cat /etc/resolv.conf
   
   # Test different DNS servers
   nslookup google.com 8.8.8.8
   nslookup google.com 1.1.1.1
   ```

2. **Fix DNS Push Configuration**
   ```conf
   # In openvpn.conf - ensure DNS is pushed to clients
   push "dhcp-option DNS 1.1.1.1"
   push "dhcp-option DNS 1.0.0.1"
   push "dhcp-option DNS 8.8.8.8"
   push "dhcp-option DNS 8.8.4.4"
   ```

3. **Test DNS Leak Prevention**
   ```bash
   # Check for DNS leaks
   curl https://1.1.1.1/cdn-cgi/trace
   
   # Test DNS leak prevention
   # Visit: https://dnsleaktest.com/
   ```

#### DNS Leaks

**Symptoms:**
- DNS queries bypass VPN
- Real location exposed through DNS
- Privacy concerns

**Solutions:**

1. **Configure DNS Leak Prevention**
   ```conf
   # In openvpn.conf
   push "dhcp-option DNS 1.1.1.1"
   push "dhcp-option DNS 1.0.0.1"
   push "block-outside-dns"  # Windows only
   push "redirect-gateway def1 bypass-dhcp"
   ```

2. **Test DNS Configuration**
   ```bash
   # Test DNS servers being used
   nslookup google.com
   
   # Check DNS leak test
   curl -s https://1.1.1.1/cdn-cgi/trace | grep -E "(ip|loc)"
   ```

### Performance Issues

#### Slow VPN Connection

**Symptoms:**
- Significantly reduced internet speed through VPN
- High latency
- Connection timeouts

**Solutions:**

1. **Check Network Performance**
   ```bash
   # Test bandwidth without VPN
   speedtest-cli
   
   # Test with VPN connected
   # (run speedtest again)
   
   # Check network interface statistics
   cat /proc/net/dev
   
   # Monitor network usage
   iftop -i tun0
   nethogs
   ```

2. **Optimize OpenVPN Configuration**
   ```conf
   # In openvpn.conf - performance optimizations
   fast-io
   sndbuf 393216
   rcvbuf 393216
   tcp-nodelay
   
   # Disable compression if not needed
   # compress lz4-v2
   
   # Use UDP for better performance
   proto udp
   ```

3. **Check System Resources**
   ```bash
   # Monitor CPU and memory usage
   top
   htop
   
   # Check disk I/O
   iostat 1
   
   # Monitor network interfaces
   watch -n 1 'cat /proc/net/dev'
   ```

#### High Latency

**Symptoms:**
- Ping times significantly higher through VPN
- Slow response times
- Gaming or real-time application issues

**Solutions:**

1. **Test Latency**
   ```bash
   # Test ping to VPN server
   ping YOUR_SERVER_IP
   
   # Test ping through VPN
   ping 8.8.8.8  # With VPN connected
   
   # Test traceroute
   traceroute 8.8.8.8
   mtr google.com
   ```

2. **Optimize for Latency**
   ```conf
   # In openvpn.conf - latency optimizations
   fast-io
   tcp-nodelay
   
   # Reduce keepalive intervals
   keepalive 5 30
   
   # Use UDP protocol
   proto udp
   ```

### Firewall and Security Issues

#### Firewall Blocking VPN Traffic

**Symptoms:**
- VPN connections blocked
- Intermittent connectivity
- "Connection refused" errors

**Solutions:**

1. **Check Firewall Rules**
   ```bash
   # Check UFW status
   sudo ufw status verbose
   
   # Check iptables rules
   sudo iptables -L -n -v
   
   # Check for blocked traffic
   sudo tail -f /var/log/ufw.log
   ```

2. **Configure Firewall for VPN**
   ```bash
   # Allow OpenVPN traffic
   sudo ufw allow 1194/udp
   
   # Allow VPN subnet
   sudo ufw allow from 10.8.0.0/24
   
   # Allow forwarding
   sudo ufw route allow in on tun0 out on eth0
   ```

3. **Test Firewall Configuration**
   ```bash
   # Test port accessibility
   nmap -sU -p 1194 localhost
   
   # Check if traffic is being dropped
   sudo tcpdump -i any port 1194
   ```

#### NAT and Port Forwarding Issues

**Symptoms:**
- VPN works locally but not from external networks
- Port forwarding not working
- Router configuration issues

**Solutions:**

1. **Configure Router Port Forwarding**
   ```bash
   # Forward UDP port 1194 to VPN server
   # Router configuration (varies by router):
   # External Port: 1194
   # Internal Port: 1194
   # Protocol: UDP
   # Internal IP: [VPN Server IP]
   ```

2. **Test External Connectivity**
   ```bash
   # Test from external network
   nmap -sU -p 1194 YOUR_EXTERNAL_IP
   
   # Check if port is open
   # Use online port checker tools
   ```

## Network Diagnostics

### Connection Testing

```bash
# Test VPN server connectivity
ping YOUR_SERVER_IP

# Test VPN port
nmap -sU -p 1194 YOUR_SERVER_IP

# Test from VPN client
ping 10.8.0.1  # VPN gateway
ping 8.8.8.8   # Internet connectivity
nslookup google.com  # DNS resolution

# Check network interfaces
ip addr show
ifconfig

# Check routing
ip route show
route -n
```

### Traffic Analysis

```bash
# Monitor VPN traffic
sudo tcpdump -i tun0 -n

# Monitor all network traffic
sudo tcpdump -i any port 1194

# Check network statistics
netstat -i
ss -tuln

# Monitor bandwidth usage
iftop -i tun0
nethogs
```

### Performance Testing

```bash
# Test network speed
speedtest-cli

# Test latency
ping -c 10 8.8.8.8

# Test packet loss
ping -c 100 8.8.8.8 | grep "packet loss"

# Network performance monitoring
iperf3 -s  # On server
iperf3 -c SERVER_IP  # On client
```

## Advanced Network Troubleshooting

### Packet Capture Analysis

```bash
# Capture VPN traffic
sudo tcpdump -i tun0 -w vpn-traffic.pcap

# Capture OpenVPN handshake
sudo tcpdump -i any port 1194 -w handshake.pcap

# Analyze with Wireshark (if available)
wireshark vpn-traffic.pcap
```

### Network Stack Debugging

```bash
# Check network stack statistics
cat /proc/net/netstat
cat /proc/net/snmp

# Check network buffer usage
cat /proc/net/sockstat

# Monitor network errors
watch -n 1 'cat /proc/net/dev | grep -E "(eth0|tun0)"'
```

## Prevention and Monitoring

### Network Monitoring Setup

```bash
# Set up continuous monitoring
# Create monitoring script
cat > scripts/network-monitor.sh << 'EOF'
#!/bin/bash
while true; do
  echo "$(date): Checking network status..."
  
  # Check VPN interface
  if ip link show tun0 >/dev/null 2>&1; then
    echo "✅ VPN interface active"
  else
    echo "❌ VPN interface down"
  fi
  
  # Check connectivity
  if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
    echo "✅ Internet connectivity OK"
  else
    echo "❌ Internet connectivity failed"
  fi
  
  sleep 60
done
EOF

chmod +x scripts/network-monitor.sh
```

### Automated Network Testing

```bash
# Create network test script
cat > scripts/network-test.sh << 'EOF'
#!/bin/bash
echo "=== Network Diagnostic Report ==="
echo "Date: $(date)"
echo

echo "=== Network Interfaces ==="
ip addr show

echo "=== Routing Table ==="
ip route show

echo "=== DNS Configuration ==="
cat /etc/resolv.conf

echo "=== Firewall Status ==="
sudo ufw status verbose

echo "=== OpenVPN Status ==="
sudo systemctl status openvpn@server

echo "=== Network Connectivity Tests ==="
ping -c 3 8.8.8.8
nslookup google.com
EOF

chmod +x scripts/network-test.sh
```

## Related Documentation

- [Network Configuration](../configuration/networking.md) - Network setup
- [Firewall Configuration](../security/README.md) - Security setup
- [Common Issues](common-issues.md) - General troubleshooting
- [Performance Optimization](performance.md) - Performance tuning

---
**Previous**: [Certificate Issues](certificates.md) | **Next**: [Common Issues](common-issues.md) | **Up**: [Troubleshooting](README.md)