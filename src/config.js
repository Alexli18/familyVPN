module.exports = {
  vpn: {
    subnet: process.env.VPN_SUBNET || '10.8.0.0',
    netmask: process.env.VPN_NETMASK || '255.255.255.0',
    host: process.env.VPN_HOST || '69.62.127.190',
    port: 1194,
    protocol: 'udp'
  },
  certificates: {
    dir: process.env.VPN_CERT_DIR || '/etc/openvpn/certificates',
    serverCertName: 'server',
    validityDays: 3650 // 10 years
  },
  config: {
    path: process.env.VPN_CONFIG_DIR || '/etc/openvpn'
  }
};