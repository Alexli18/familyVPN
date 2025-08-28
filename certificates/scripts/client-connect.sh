#!/bin/bash
# Client Connect Script
# Logs client connections and applies access controls

# Environment variables provided by OpenVPN:
# $common_name - Client certificate common name
# $trusted_ip - Client's real IP address
# $ifconfig_pool_remote_ip - VPN IP assigned to client

# Log connection
logger "VPN-ACCESS: Client '$common_name' connected from $trusted_ip (VPN IP: $ifconfig_pool_remote_ip)"

# Security logging
echo "$(date): CONNECT - CN: $common_name, Real IP: $trusted_ip, VPN IP: $ifconfig_pool_remote_ip" >> certificates/client-access.log

# Apply client-specific firewall rules based on common name
case "$common_name" in
    "admin_"*)
        # Admin clients get full access
        logger "VPN-ACCESS: Admin access granted to $common_name"
        ;;
    "guest_"*)
        # Guest clients get restricted access
        logger "VPN-ACCESS: Guest access granted to $common_name"
        # Block access to local networks
        iptables -I FORWARD -s $ifconfig_pool_remote_ip -d 192.168.0.0/16 -j DROP
        iptables -I FORWARD -s $ifconfig_pool_remote_ip -d 10.0.0.0/8 -j DROP
        iptables -I FORWARD -s $ifconfig_pool_remote_ip -d 172.16.0.0/12 -j DROP
        ;;
    *)
        # Default access for regular clients
        logger "VPN-ACCESS: Standard access granted to $common_name"
        ;;
esac

# Rate limiting per client
iptables -I FORWARD -s $ifconfig_pool_remote_ip -m limit --limit 100/sec --limit-burst 200 -j ACCEPT
iptables -I FORWARD -s $ifconfig_pool_remote_ip -j DROP

exit 0
