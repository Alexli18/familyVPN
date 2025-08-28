# Performance Optimization

This guide covers performance issues, optimization techniques, and monitoring for the Family VPN Server.

## Performance Issues

### Slow VPN Connection

**Symptoms:**
- Low data transfer speeds
- High latency/ping times
- Connection timeouts
- Slow web browsing through VPN

**Diagnostic Steps:**

```bash
# Test connection speed without VPN
speedtest-cli  # if available
curl -o /dev/null -s -w "%{speed_download}\n" http://speedtest.wdc01.softlayer.com/downloads/test100.zip

# Test VPN interface performance
iperf3 -s  # on server
iperf3 -c server-ip  # on client

# Check network interface statistics
ip -s link show tun0
cat /proc/net/dev | grep tun0
```

**Solutions:**

```bash
# 1. Optimize OpenVPN configuration
# Add to openvpn.conf:
echo "sndbuf 0" >> certificates/openvpn.conf
echo "rcvbuf 0" >> certificates/openvpn.conf
echo "fast-io" >> certificates/openvpn.conf
echo "comp-lzo adaptive" >> certificates/openvpn.conf

# 2. Adjust MTU size
# Test optimal MTU
ping -M do -s 1472 8.8.8.8  # Start with 1472, reduce if fragmentation occurs
# Add to config:
echo "tun-mtu 1500" >> certificates/openvpn.conf
echo "mssfix 1460" >> certificates/openvpn.conf

# 3. Use UDP protocol (default, but verify)
grep "proto udp" certificates/openvpn.conf

# 4. Optimize cipher selection
echo "cipher AES-256-GCM" >> certificates/openvpn.conf
echo "auth SHA256" >> certificates/openvpn.conf

# Restart OpenVPN after changes
sudo systemctl restart openvpn@server
```

### High CPU Usage

**Symptoms:**
- System becomes unresponsive
- High load averages
- Slow application response

**Diagnostic Steps:**

```bash
# Monitor CPU usage
top -p $(pgrep -f "node.*server.js")
htop  # if available

# Check system load
uptime
cat /proc/loadavg

# Monitor OpenVPN process
top -p $(pgrep openvpn)

# Check for CPU-intensive processes
ps aux --sort=-%cpu | head -10
```

**Solutions:**

```bash
# 1. Optimize Node.js performance
# Set NODE_ENV for production
echo "NODE_ENV=production" >> .env

# 2. Limit concurrent connections
# Add to openvpn.conf:
echo "max-clients 10" >> certificates/openvpn.conf

# 3. Use hardware acceleration if available
# Check for AES-NI support
grep -m1 -o aes /proc/cpuinfo
# If available, use AES-256-GCM cipher (already optimized)

# 4. Adjust process priority
# Lower priority for non-critical processes
renice +5 $(pgrep -f "node.*server.js")

# 5. Monitor and limit resource usage
# Use systemd to limit resources (if using systemd)
sudo systemctl edit openvpn@server
# Add:
# [Service]
# CPUQuota=50%
# MemoryLimit=512M
```

### Memory Issues

**Symptoms:**
- Out of memory errors
- System swapping
- Application crashes

**Diagnostic Steps:**

```bash
# Check memory usage
free -h
cat /proc/meminfo

# Monitor specific processes
ps aux --sort=-%mem | head -10
pmap $(pgrep -f "node.*server.js")

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full node server.js  # for debugging

# Monitor swap usage
swapon -s
cat /proc/swaps
```

**Solutions:**

```bash
# 1. Optimize Node.js memory usage
# Set memory limits
node --max-old-space-size=512 server.js

# 2. Clean up log files regularly
# Add to crontab
echo "0 2 * * * find /path/to/vpn/logs -name '*.log' -mtime +30 -delete" | crontab -

# 3. Optimize OpenVPN memory usage
# Add to openvpn.conf:
echo "mlock" >> certificates/openvpn.conf  # Lock memory pages

# 4. Add swap if needed (temporary solution)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 5. Monitor memory usage
# Add monitoring script
cat > memory-monitor.sh << 'EOF'
#!/bin/bash
THRESHOLD=80
USAGE=$(free | awk 'FNR==2{printf "%.0f", $3/($3+$4)*100}')
if [ $USAGE -gt $THRESHOLD ]; then
    echo "High memory usage: $USAGE%" | logger -t vpn-monitor
    # Optional: restart services if critical
fi
EOF
chmod +x memory-monitor.sh
```

### Network Performance Issues

**Symptoms:**
- Packet loss
- High network latency
- Connection drops

**Diagnostic Steps:**

```bash
# Test network connectivity
ping -c 100 8.8.8.8 | tail -5  # Check packet loss
mtr google.com  # Network path analysis

# Check network interface errors
ip -s link show
netstat -i

# Monitor network traffic
iftop  # if available
nethogs  # if available
ss -i  # Socket statistics

# Check firewall performance
iptables -L -n -v  # Check rule hit counts
```

**Solutions:**

```bash
# 1. Optimize network buffer sizes
# System-wide network optimization
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_rmem = 4096 87380 16777216' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_wmem = 4096 65536 16777216' >> /etc/sysctl.conf
sysctl -p

# 2. Optimize OpenVPN buffers
echo "sndbuf 393216" >> certificates/openvpn.conf
echo "rcvbuf 393216" >> certificates/openvpn.conf

# 3. Reduce firewall overhead
# Optimize iptables rules (move most common rules to top)
npm run firewall:optimize

# 4. Use connection tracking optimization
echo 'net.netfilter.nf_conntrack_max = 65536' >> /etc/sysctl.conf
sysctl -p
```

## Performance Monitoring

### System Monitoring Setup

```bash
# Install monitoring tools (Ubuntu/Debian)
sudo apt-get install htop iotop iftop nethogs sysstat

# Install monitoring tools (CentOS/RHEL)
sudo yum install htop iotop iftop nethogs sysstat

# Enable system statistics collection
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

### Performance Monitoring Script

```bash
#!/bin/bash
# performance-monitor.sh - Continuous performance monitoring

LOG_FILE="performance-$(date +%Y%m%d).log"

while true; do
    echo "=== $(date) ===" >> $LOG_FILE
    
    # CPU usage
    echo "CPU Usage:" >> $LOG_FILE
    top -bn1 | grep "Cpu(s)" >> $LOG_FILE
    
    # Memory usage
    echo "Memory Usage:" >> $LOG_FILE
    free -h >> $LOG_FILE
    
    # Network statistics
    echo "Network Stats:" >> $LOG_FILE
    ip -s link show tun0 >> $LOG_FILE 2>/dev/null
    
    # VPN connections
    echo "Active Connections:" >> $LOG_FILE
    ss -tuln | grep -E "(1194|3000)" >> $LOG_FILE
    
    # Process information
    echo "VPN Processes:" >> $LOG_FILE
    ps aux | grep -E "(node|openvpn)" | grep -v grep >> $LOG_FILE
    
    echo "" >> $LOG_FILE
    
    sleep 300  # Monitor every 5 minutes
done
```

### Real-time Performance Dashboard

```bash
#!/bin/bash
# performance-dashboard.sh - Real-time performance display

while true; do
    clear
    echo "🖥️  Family VPN Server Performance Dashboard"
    echo "=========================================="
    echo "Last updated: $(date)"
    echo ""
    
    # System load
    echo "📊 System Load:"
    uptime
    echo ""
    
    # CPU usage
    echo "🔥 CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//'
    echo ""
    
    # Memory usage
    echo "💾 Memory Usage:"
    free -h | grep "Mem:"
    echo ""
    
    # Disk usage
    echo "💿 Disk Usage:"
    df -h / | tail -1
    echo ""
    
    # Network interfaces
    echo "🌐 Network Interfaces:"
    ip addr show | grep -E "(inet |UP|DOWN)" | grep -v "127.0.0.1"
    echo ""
    
    # Active VPN connections
    echo "🔗 VPN Connections:"
    if [ -f "/var/log/openvpn/server.log" ]; then
        grep "CLIENT_LIST" /var/log/openvpn/server.log | tail -5
    else
        echo "No OpenVPN log found"
    fi
    echo ""
    
    # Service status
    echo "⚙️  Service Status:"
    if pgrep -f "node.*server.js" > /dev/null; then
        echo "✅ Web Server: Running"
    else
        echo "❌ Web Server: Stopped"
    fi
    
    if pgrep openvpn > /dev/null; then
        echo "✅ OpenVPN: Running"
    else
        echo "❌ OpenVPN: Stopped"
    fi
    
    sleep 5
done
```

## Performance Optimization Checklist

### System-Level Optimizations

- [ ] **CPU Optimization**
  - [ ] Enable hardware acceleration (AES-NI)
  - [ ] Optimize process priorities
  - [ ] Use efficient ciphers (AES-256-GCM)
  - [ ] Limit concurrent connections

- [ ] **Memory Optimization**
  - [ ] Set appropriate Node.js memory limits
  - [ ] Configure swap if needed
  - [ ] Clean up log files regularly
  - [ ] Monitor for memory leaks

- [ ] **Network Optimization**
  - [ ] Optimize buffer sizes
  - [ ] Configure optimal MTU
  - [ ] Use UDP protocol
  - [ ] Optimize firewall rules

- [ ] **Storage Optimization**
  - [ ] Use SSD storage if possible
  - [ ] Regular log rotation
  - [ ] Monitor disk space
  - [ ] Optimize file permissions

### Application-Level Optimizations

- [ ] **Node.js Optimizations**
  - [ ] Set NODE_ENV=production
  - [ ] Use clustering if needed
  - [ ] Optimize database queries
  - [ ] Implement caching

- [ ] **OpenVPN Optimizations**
  - [ ] Use optimal cipher suite
  - [ ] Configure compression
  - [ ] Optimize buffer sizes
  - [ ] Use fast-io mode

- [ ] **Web Interface Optimizations**
  - [ ] Minimize HTTP requests
  - [ ] Compress static assets
  - [ ] Use browser caching
  - [ ] Optimize images

### Monitoring and Alerting

- [ ] **Performance Monitoring**
  - [ ] Set up system monitoring
  - [ ] Monitor key metrics
  - [ ] Create performance baselines
  - [ ] Set up alerting thresholds

- [ ] **Log Management**
  - [ ] Implement log rotation
  - [ ] Monitor log sizes
  - [ ] Set up log analysis
  - [ ] Archive old logs

## Performance Benchmarking

### Baseline Performance Test

```bash
#!/bin/bash
# baseline-test.sh - Establish performance baseline

echo "🧪 Family VPN Server Performance Baseline Test"
echo "=============================================="

# System information
echo "System Information:"
uname -a
cat /proc/cpuinfo | grep "model name" | head -1
free -h | grep "Mem:"
df -h / | tail -1
echo ""

# Network baseline (without VPN)
echo "Network Baseline (without VPN):"
ping -c 10 8.8.8.8 | tail -1
echo ""

# Start services if not running
if ! pgrep -f "node.*server.js" > /dev/null; then
    npm start &
    sleep 5
fi

# Web interface response time
echo "Web Interface Performance:"
time curl -s http://localhost:3000 > /dev/null
echo ""

# Certificate generation performance
echo "Certificate Generation Performance:"
time npm run generate-client test-perf-client > /dev/null 2>&1
echo ""

# API response time
echo "API Performance:"
time curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' > /dev/null
echo ""

echo "Baseline test completed"
echo "Save these results for comparison"
```

### Load Testing

```bash
#!/bin/bash
# load-test.sh - Simple load testing

echo "🔥 Load Testing Family VPN Server"
echo "================================="

# Test concurrent connections to web interface
echo "Testing concurrent web connections..."
for i in {1..10}; do
    curl -s http://localhost:3000 > /dev/null &
done
wait

# Test API load
echo "Testing API load..."
for i in {1..20}; do
    curl -s -X GET http://localhost:3000/api/status > /dev/null &
done
wait

echo "Load test completed"
echo "Check system resources during test"
```

Remember to establish performance baselines when the system is working optimally, and regularly compare current performance against these baselines to detect degradation early.