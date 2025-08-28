#!/bin/bash
# DNS Leak Monitoring Script
# Monitors for potential DNS leaks and logs suspicious activity

# Configuration
LOG_FILE="/var/log/openvpn/dns-monitor.log"
VPN_INTERFACE="tun0"
ALLOWED_DNS_SERVERS="1.1.1.1 1.0.0.1 9.9.9.9 149.112.112.112"

# Function to log DNS events
log_dns_event() {
    echo "$(date): $1" >> $LOG_FILE
    logger "VPN-DNS: $1"
}

# Monitor DNS queries from VPN clients
monitor_dns_queries() {
    # Use tcpdump to monitor DNS traffic on VPN interface
    tcpdump -i $VPN_INTERFACE -n port 53 -l | while read line; do
        # Extract DNS server from query
        dns_server=$(echo "$line" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | tail -1)
        
        if [ ! -z "$dns_server" ]; then
            # Check if DNS server is in allowed list
            if ! echo "$ALLOWED_DNS_SERVERS" | grep -q "$dns_server"; then
                log_dns_event "POTENTIAL DNS LEAK: Query to unauthorized DNS server $dns_server"
                
                # Block the unauthorized DNS server
                iptables -I FORWARD -d $dns_server -p udp --dport 53 -j DROP
                iptables -I FORWARD -d $dns_server -p tcp --dport 53 -j DROP
                
                log_dns_event "BLOCKED: Unauthorized DNS server $dns_server"
            fi
        fi
    done
}

# Start monitoring if VPN interface exists
if ip link show $VPN_INTERFACE >/dev/null 2>&1; then
    log_dns_event "Starting DNS leak monitoring on $VPN_INTERFACE"
    monitor_dns_queries &
else
    log_dns_event "VPN interface $VPN_INTERFACE not found, monitoring disabled"
fi
