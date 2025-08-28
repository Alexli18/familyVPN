#!/bin/bash
# OpenVPN down script - Clean up firewall rules
iptables -D FORWARD -i $dev -j ACCEPT 2>/dev/null
iptables -D FORWARD -o $dev -j ACCEPT 2>/dev/null
iptables -D INPUT -i $dev -j ACCEPT 2>/dev/null
iptables -t nat -D POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE 2>/dev/null

# Log disconnection
logger "OpenVPN: Client disconnected from $trusted_ip"
