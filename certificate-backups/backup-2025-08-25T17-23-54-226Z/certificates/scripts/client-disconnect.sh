#!/bin/bash
# Client Disconnect Script
# Logs client disconnections and cleans up access controls

# Log disconnection
logger "VPN-ACCESS: Client '$common_name' disconnected from $trusted_ip"

# Security logging
echo "$(date): DISCONNECT - CN: $common_name, Real IP: $trusted_ip, VPN IP: $ifconfig_pool_remote_ip" >> /Users/alex/Desktop/privateVPN/test-certificates/client-access.log

# Clean up client-specific firewall rules
iptables -D FORWARD -s $ifconfig_pool_remote_ip -m limit --limit 100/sec --limit-burst 200 -j ACCEPT 2>/dev/null
iptables -D FORWARD -s $ifconfig_pool_remote_ip -j DROP 2>/dev/null

# Clean up guest restrictions if applicable
case "$common_name" in
    "guest_"*)
        iptables -D FORWARD -s $ifconfig_pool_remote_ip -d 192.168.0.0/16 -j DROP 2>/dev/null
        iptables -D FORWARD -s $ifconfig_pool_remote_ip -d 10.0.0.0/8 -j DROP 2>/dev/null
        iptables -D FORWARD -s $ifconfig_pool_remote_ip -d 172.16.0.0/12 -j DROP 2>/dev/null
        ;;
esac

exit 0
