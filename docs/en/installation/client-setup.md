# Client Setup Guide

This guide will help you set up VPN clients on various devices to connect to your Family VPN Server.

## Overview

After your VPN server is running, you'll need to:
1. Generate client certificates
2. Install VPN client software on your devices
3. Import the configuration
4. Connect and verify the connection

## Prerequisites

Before setting up clients, ensure you have:
- A running VPN server (see [Docker Installation](docker.md) or [Local Installation](local.md))
- Access to the web management portal OR administrator access to generate certificates
- The VPN server address (IP or domain name)

## Step 1: Getting Your VPN Configuration

### Option A: Web Portal (Recommended)

1. **Access the Management Portal**:
   - Open your web browser
   - Go to `https://your-server-address:3000`
   - You'll see a login page

2. **Login**:
   - Enter the username and password provided by your administrator
   - Click "Login"

3. **Generate Your Certificate**:
   - Once logged in, you'll see the certificate management page
   - Click "Generate New Certificate"
   - Enter a unique name for your device (e.g., "john-laptop", "mary-iphone")
   - Click "Generate Certificate"

4. **Download Configuration**:
   - Your `.ovpn` file will be automatically downloaded
   - Save it to a memorable location on your device

### Option B: Command Line (Administrator)

If you have administrator access to the server:

```bash
# Generate a new client certificate
npm run generate-client

# Follow the prompts to enter client name
# The .ovpn file will be created in the certificates directory
```

### Option C: Request from Administrator

If you don't have direct access:
1. Contact your VPN administrator
2. Request a VPN configuration for your device
3. Provide a unique name for your device
4. Wait for them to send you the `.ovpn` file

## Step 2: Install VPN Client Software

Choose the appropriate client for your device:

### Windows

1. **Download OpenVPN Connect**:
   - Go to https://openvpn.net/client-connect-vpn-for-windows/
   - Download and install "OpenVPN Connect"

2. **Import Configuration**:
   - Open OpenVPN Connect
   - Click the "+" button
   - Select "File" and browse to your `.ovpn` file
   - Click "Add"

3. **Connect**:
   - Click on your profile name
   - Toggle the connection switch to "ON"
   - Enter any required credentials if prompted

### macOS

1. **Download Tunnelblick** (Free):
   - Go to https://tunnelblick.net/
   - Download and install Tunnelblick
   - Follow the installation instructions

2. **Import Configuration**:
   - Double-click your `.ovpn` file
   - Tunnelblick will ask to install the configuration
   - Click "Install" and enter your Mac password

3. **Connect**:
   - Click the Tunnelblick icon in your menu bar
   - Select your configuration
   - Click "Connect"

### iPhone/iPad

1. **Download OpenVPN Connect**:
   - Open the App Store
   - Search for "OpenVPN Connect"
   - Install the app

2. **Import Configuration**:
   - Email the `.ovpn` file to yourself
   - Open the email on your iPhone/iPad
   - Tap the `.ovpn` attachment
   - Choose "Copy to OpenVPN"

3. **Connect**:
   - Open OpenVPN Connect
   - Tap your profile
   - Tap the connection toggle

### Android

1. **Download OpenVPN for Android**:
   - Open Google Play Store
   - Search for "OpenVPN for Android"
   - Install the app

2. **Import Configuration**:
   - Copy the `.ovpn` file to your device
   - Open OpenVPN for Android
   - Tap the "+" button
   - Select "Import Profile from SD card"
   - Browse to your `.ovpn` file

3. **Connect**:
   - Tap your profile name
   - Tap "Connect"

### Linux

1. **Install OpenVPN**:
   ```bash
   # Ubuntu/Debian
   sudo apt install openvpn
   
   # CentOS/RHEL/Fedora
   sudo yum install openvpn  # or dnf install openvpn
   
   # Arch Linux
   sudo pacman -S openvpn
   ```

2. **Connect**:
   ```bash
   sudo openvpn --config /path/to/your-config.ovpn
   ```

## Step 3: Verify Your Connection

After connecting, verify that your VPN is working:

1. **Check Your IP Address**:
   - Go to https://whatismyipaddress.com/
   - Your IP should show the VPN server's location, not your real location

2. **Test DNS**:
   - Go to https://dnsleaktest.com/
   - Run the test to ensure your DNS requests are going through the VPN

3. **Check for WebRTC Leaks**:
   - Go to https://browserleaks.com/webrtc
   - Ensure your real IP is not visible

## Managing Multiple Devices

If you have multiple devices (phone, laptop, tablet):

1. **Generate Separate Certificates**:
   - Each device should have its own certificate
   - Use descriptive names (e.g., "john-laptop", "john-phone")

2. **Keep Track of Your Devices**:
   - Make a list of which certificate is on which device
   - Note when certificates were created

3. **Regular Maintenance**:
   - Remove certificates from devices you no longer use
   - Request new certificates before old ones expire

## Security Best Practices

### Protect Your Configuration
- Keep `.ovpn` files secure and don't share them
- Remove configuration files from email after downloading
- Store them in a secure location on your device

### Device Security
- Use strong device security (screen locks, updates, antivirus)
- Keep your VPN client software updated
- Enable automatic security updates where possible

### Monitor Connections
- Always verify VPN status before browsing sensitive content
- Periodically check your IP address to ensure VPN is working
- Disconnect when not needed to save battery/bandwidth

### Lost or Stolen Devices
If a device with VPN access is lost or stolen:
1. Immediately contact your administrator
2. Request certificate revocation for the lost device
3. Generate new certificates for replacement devices
4. Change passwords for any accounts accessed through the VPN

## Troubleshooting

For detailed troubleshooting information, see the [Troubleshooting Guide](../troubleshooting/common-issues.md).

### Common Issues

#### Connection Problems
- **"Connection timeout"**: Check internet connection and server address
- **"Authentication failed"**: Certificate may be expired or revoked
- **"Connected but no internet"**: Try disconnecting and reconnecting

#### Performance Issues
- **Slow speeds**: Check server load and try different times
- **Frequent disconnections**: Check internet connection stability

### Getting Help

When contacting support, provide:
- Device information (OS, VPN client version)
- Exact error messages
- When the problem started
- Network information (ISP, connection type)

## Next Steps

After successful client setup:
1. **Review [Security Best Practices](../security/best-practices.md)**
2. **Learn about [Certificate Management](../configuration/certificates.md)**
3. **Check [Troubleshooting Guides](../troubleshooting/)** for common issues
4. **Explore [Advanced Configuration](../configuration/)** options