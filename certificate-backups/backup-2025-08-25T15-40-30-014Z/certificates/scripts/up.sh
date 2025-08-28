#!/bin/bash
# OpenVPN up script - Configure firewall rules
iptables -I FORWARD -i $dev -j ACCEPT
iptables -I FORWARD -o $dev -j ACCEPT
iptables -I INPUT -i $dev -j ACCEPT
iptables -t nat -I POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

# Log connection
logger "OpenVPN: Client connected from $trusted_ip"
