# 🚀 First Time Setup Guide - Family VPN Server

**Welcome!** This guide will help you set up your own private VPN server from scratch, even if you're not technical. Follow these steps carefully, and you'll have a secure VPN running for your family in about 30-60 minutes.

## 📋 What You'll Need

Before we start, make sure you have:

- **A computer** (Windows, Mac, or Linux)
- **Internet connection**
- **About 1 hour of time**
- **Administrator/root access** on your computer
- **Optional**: A cloud server (AWS, Google Cloud, etc.) if you want to host it online

## 🎯 Choose Your Installation Method

Pick the method that works best for you:

1. **[🐳 Docker (Recommended)](#docker-installation-recommended)** - Easiest and safest
2. **[☁️ Cloud Deployment](#cloud-deployment)** - For remote access from anywhere
3. **[💻 Local Installation](#local-installation)** - Direct installation on your computer

---

## 🐳 Docker Installation (Recommended)

Docker makes installation simple and keeps everything contained. This is the safest option for beginners.

### Step 1: Install Docker

#### On Windows:
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop/
2. Run the installer and follow the setup wizard
3. Restart your computer when prompted
4. Open Docker Desktop and wait for it to start

#### On Mac:
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop/
2. Drag Docker to your Applications folder
3. Open Docker from Applications
4. Follow the setup instructions

#### On Linux (Ubuntu/Debian):
```bash
# Update your system
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then test
docker --version
```

### Step 2: Download the VPN Server

1. **Download the project**:
   ```bash
   git clone https://github.com/your-username/family-vpn-server.git
   cd family-vpn-server
   ```

   *Don't have git? Download the ZIP file from GitHub and extract it.*

### Step 3: Quick Setup

1. **Copy the example configuration**:
   ```bash
   cp .env.example .env
   ```

2. **Edit your configuration**:
   Open the `.env` file in a text editor and change:
   ```env
   VPN_HOST=YOUR_COMPUTER_IP_ADDRESS
   ```
   
   **How to find your IP address:**
   - **Windows**: Open Command Prompt, type `ipconfig`, look for "IPv4 Address"
   - **Mac**: System Preferences → Network → Advanced → TCP/IP
   - **Linux**: Type `ip addr show` or `hostname -I`

### Step 4: Start Your VPN Server

1. **Build and start the server**:
   ```bash
   npm run docker:build
   npm run docker:up
   ```

2. **Wait for startup** (about 2-3 minutes). You'll see logs showing the server starting.

3. **Check if it's working**:
   ```bash
   npm run docker:logs
   ```
   
   Look for messages like "Server running on port 3000" and "OpenVPN server started".

### Step 5: Set Up Admin Access

1. **Create admin credentials**:
   ```bash
   docker exec -it family-vpn-server npm run setup-auth
   ```
   
   Follow the prompts to create your admin username and password.

### Step 6: Access Your VPN Management

1. **Open your web browser** and go to: `http://YOUR_COMPUTER_IP:3000`
2. **Log in** with the credentials you just created
3. **You should see the VPN management interface!**

🎉 **Congratulations!** Your VPN server is now running. Skip to [Creating Client Certificates](#creating-client-certificates).

---

## ☁️ Cloud Deployment

Deploy your VPN server on a cloud platform for access from anywhere in the world.

### AWS Deployment

#### Step 1: Create an AWS Account
1. Go to https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Follow the registration process

#### Step 2: Launch an EC2 Instance
1. **Go to EC2 Dashboard**
2. **Click "Launch Instance"**
3. **Choose AMI**: Select "Ubuntu Server 22.04 LTS"
4. **Choose Instance Type**: t3.micro (free tier eligible)
5. **Configure Security Group**:
   - Add rule: Type "Custom UDP", Port 1194, Source "0.0.0.0/0"
   - Add rule: Type "Custom TCP", Port 3000, Source "Your IP" (for management)
   - Add rule: Type "SSH", Port 22, Source "Your IP"
6. **Create or select a key pair** for SSH access
7. **Launch the instance**

#### Step 3: Connect to Your Instance
1. **Wait for instance to be "running"**
2. **Note the Public IPv4 address**
3. **Connect via SSH**:
   ```bash
   ssh -i your-key.pem ubuntu@YOUR_INSTANCE_PUBLIC_IP
   ```

#### Step 4: Install Docker on AWS
```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Install git and other tools
sudo apt install -y git curl

# Log out and back in
exit
```

Reconnect to your instance, then continue with Step 5.

#### Step 5: Deploy the VPN Server
```bash
# Clone the repository
git clone https://github.com/your-username/family-vpn-server.git
cd family-vpn-server

# Copy and edit configuration
cp .env.example .env
nano .env
```

**Edit the .env file**:
```env
VPN_HOST=YOUR_AWS_INSTANCE_PUBLIC_IP
NODE_ENV=production
```

```bash
# Build and start
npm run docker:build
npm run docker:up

# Set up admin credentials
docker exec -it family-vpn-server npm run setup-auth
```

#### Step 6: Access Your Cloud VPN
1. **Open browser**: `http://YOUR_AWS_INSTANCE_PUBLIC_IP:3000`
2. **Log in** with your admin credentials
3. **Your cloud VPN is ready!**

### Google Cloud Deployment

#### Step 1: Create Google Cloud Account
1. Go to https://cloud.google.com/
2. Click "Get started for free"
3. Complete the registration (includes $300 free credit)

#### Step 2: Create a VM Instance
1. **Go to Compute Engine → VM instances**
2. **Click "Create Instance"**
3. **Configure**:
   - Name: `family-vpn-server`
   - Region: Choose closest to you
   - Machine type: `e2-micro` (free tier)
   - Boot disk: Ubuntu 22.04 LTS
   - Firewall: Allow HTTP and HTTPS traffic
4. **Click "Create"**

#### Step 3: Configure Firewall Rules
1. **Go to VPC network → Firewall**
2. **Click "Create Firewall Rule"**
3. **Create rule for OpenVPN**:
   - Name: `allow-openvpn`
   - Direction: Ingress
   - Action: Allow
   - Targets: All instances in the network
   - Source IP ranges: `0.0.0.0/0`
   - Protocols and ports: UDP 1194
4. **Create rule for management**:
   - Name: `allow-vpn-management`
   - Direction: Ingress
   - Action: Allow
   - Targets: All instances in the network
   - Source IP ranges: Your IP address
   - Protocols and ports: TCP 3000

#### Step 4: Connect and Install
1. **Click "SSH" next to your instance**
2. **Run installation commands**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install git
   sudo apt install -y git
   
   # Logout and login again
   exit
   ```

3. **Reconnect and deploy**:
   ```bash
   # Clone repository
   git clone https://github.com/your-username/family-vpn-server.git
   cd family-vpn-server
   
   # Configure
   cp .env.example .env
   nano .env
   ```
   
   Set `VPN_HOST` to your Google Cloud instance's external IP.
   
   ```bash
   # Deploy
   npm run docker:build
   npm run docker:up
   
   # Setup admin
   docker exec -it family-vpn-server npm run setup-auth
   ```

### Hostinger VPS Deployment

Hostinger offers affordable VPS hosting that's perfect for family VPN servers. Here's how to deploy using Docker:

#### Step 1: Get a Hostinger VPS
1. **Go to https://www.hostinger.com/vps-hosting**
2. **Choose a VPS plan**:
   - **VPS 1** (1 vCPU, 1GB RAM) - Good for small families (2-5 devices)
   - **VPS 2** (2 vCPU, 2GB RAM) - Better for larger families (5-10 devices)
3. **Complete the purchase** and wait for setup email

#### Step 2: Access Your VPS
1. **Check your email** for VPS login credentials
2. **Connect via SSH**:
   ```bash
   ssh root@YOUR_VPS_IP_ADDRESS
   ```
   Use the password provided in the email

#### Step 3: Initial Server Setup
```bash
# Update the system
apt update && apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install additional tools
apt install -y git curl nano ufw

# Set up firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 1194/udp
ufw allow 3000/tcp
ufw --force enable

# Create a non-root user (optional but recommended)
adduser vpnadmin
usermod -aG sudo vpnadmin
usermod -aG docker vpnadmin
```

#### Step 4: Deploy the VPN Server
```bash
# Switch to vpnadmin user (if created)
su - vpnadmin

# Clone the repository
git clone https://github.com/your-username/family-vpn-server.git
cd family-vpn-server

# Configure environment
cp .env.example .env
nano .env
```

**Edit the .env file with your Hostinger VPS details**:
```env
VPN_HOST=YOUR_HOSTINGER_VPS_IP
NODE_ENV=production
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0
API_PORT=3000
```

```bash
# Build and deploy with Docker
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Set up admin credentials
docker exec -it family-vpn-server-prod npm run setup-auth

# Check if everything is running
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

#### Step 5: Configure Domain (Optional)
If you have a domain name, you can point it to your Hostinger VPS:

1. **In Hostinger control panel**:
   - Go to DNS Zone Editor
   - Add an A record pointing your domain to the VPS IP

2. **Update your .env file**:
   ```env
   VPN_HOST=your-domain.com
   ```

3. **Restart the container**:
   ```bash
   docker-compose -f docker-compose.prod.yml restart
   ```

#### Step 6: Set Up SSL (Optional)
For secure web management interface:

```bash
# Install Certbot
sudo apt install -y certbot

# Get SSL certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com

# Update docker-compose to use SSL
# Edit docker-compose.prod.yml to mount SSL certificates
```

### Other Cloud Providers with Docker

The same Docker deployment method works with other cloud providers:

#### DigitalOcean Droplets
1. **Create a Droplet** with Ubuntu 22.04
2. **Follow the same Docker installation steps** as Hostinger
3. **Configure firewall** in DigitalOcean control panel
4. **Deploy using docker-compose**

#### Vultr VPS
1. **Deploy a server** with Ubuntu 22.04
2. **Install Docker** using the same commands
3. **Configure firewall rules** for ports 1194 (UDP) and 3000 (TCP)
4. **Deploy the VPN server** with docker-compose

#### Linode VPS
1. **Create a Linode** with Ubuntu 22.04
2. **Follow Docker installation** process
3. **Set up Cloud Firewall** or use ufw
4. **Deploy using the production docker-compose file**

#### General Cloud Deployment Tips

**Security Best Practices:**
- Always change default passwords immediately
- Use SSH keys instead of passwords when possible
- Keep your VPS updated regularly
- Monitor logs for suspicious activity
- Use non-standard ports for additional security

**Performance Optimization:**
- Choose a VPS location close to your users
- Monitor CPU and memory usage
- Set up log rotation to prevent disk space issues
- Consider upgrading VPS if you have many concurrent users

**Backup Strategy:**
- Regularly backup your certificates and configuration
- Use the built-in backup commands:
  ```bash
  docker exec -it family-vpn-server-prod npm run backup:create
  ```
- Store backups in a separate location (cloud storage, etc.)

#### Quick Setup Script for Any Ubuntu VPS

Here's a quick setup script you can use on any Ubuntu-based VPS:

```bash
#!/bin/bash
# Quick VPN Server Setup Script for Ubuntu VPS

echo "🚀 Setting up Family VPN Server..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install tools
sudo apt install -y git curl nano ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 1194/udp
sudo ufw allow 3000/tcp
sudo ufw --force enable

echo "✅ Basic setup complete!"
echo "📝 Next steps:"
echo "1. Logout and login again to apply Docker permissions"
echo "2. Clone the VPN server repository"
echo "3. Configure your .env file with your server IP"
echo "4. Run: docker-compose -f docker-compose.prod.yml up -d"

# Optional: Clone repository
read -p "🤔 Clone VPN repository now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git clone https://github.com/your-username/family-vpn-server.git
    cd family-vpn-server
    cp .env.example .env
    echo "📁 Repository cloned! Edit .env file with your server IP:"
    echo "   nano .env"
    echo "Then run: docker-compose -f docker-compose.prod.yml up -d"
fi

echo "🎉 Setup script completed!"
```

Save this as `setup-vpn.sh`, make it executable with `chmod +x setup-vpn.sh`, and run with `./setup-vpn.sh`.

---

## 💻 Local Installation

Install directly on your computer without Docker.

### Step 1: Install Prerequisites

#### On Windows:
1. **Install Node.js**:
   - Download from https://nodejs.org/
   - Choose the LTS version
   - Run installer with default settings

2. **Install OpenVPN**:
   - Download from https://openvpn.net/community-downloads/
   - Install OpenVPN (not OpenVPN Connect)
   - Note the installation directory (usually `C:\Program Files\OpenVPN`)

#### On Mac:
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and OpenVPN
brew install node openvpn
```

#### On Linux (Ubuntu/Debian):
```bash
# Update system
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install OpenVPN
sudo apt install -y openvpn easy-rsa
```

### Step 2: Download and Setup

1. **Download the project**:
   ```bash
   git clone https://github.com/your-username/family-vpn-server.git
   cd family-vpn-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the setup wizard**:
   ```bash
   npm run setup
   ```
   
   This will guide you through:
   - Choosing installation directory
   - Setting up network configuration
   - Initializing the PKI (certificate system)

4. **Set up authentication**:
   ```bash
   npm run setup-auth
   ```

### Step 3: Start the Server

```bash
# Start the VPN server
npm start
```

The server will start on `http://localhost:3000`.

---

## 🔐 Creating Client Certificates

Now that your server is running, you need to create certificates for each device that will connect to the VPN.

### Step 1: Access the Web Interface

1. **Open your browser** and go to your server:
   - Local: `http://localhost:3000`
   - Docker: `http://YOUR_COMPUTER_IP:3000`
   - Cloud: `http://YOUR_CLOUD_SERVER_IP:3000`

2. **Log in** with your admin credentials

### Step 2: Generate a Certificate

1. **Click "Generate New Certificate"**
2. **Enter a client name** (examples):
   - `john-laptop`
   - `mary-iphone`
   - `family-tablet`
   - `dad-work-computer`
3. **Click "Generate"**
4. **Download the .ovpn file** when it's ready

### Step 3: Repeat for Each Device

Create a separate certificate for each device that needs VPN access:
- Each family member's phone
- Each computer/laptop
- Tablets
- Any other devices

**Important**: Never share certificate files between devices. Each device needs its own unique certificate.

---

## 📱 Setting Up Client Devices

### Windows

1. **Install OpenVPN Connect**:
   - Download from https://openvpn.net/client-connect-vpn-for-windows/
   - Install with default settings

2. **Import your certificate**:
   - Open OpenVPN Connect
   - Click "+" to add a profile
   - Select "File" and choose your `.ovpn` file
   - Click "Add"

3. **Connect**:
   - Click the toggle switch next to your profile
   - Enter any required credentials
   - You should see "Connected" status

### Mac

1. **Install Tunnelblick**:
   - Download from https://tunnelblick.net/
   - Install the application

2. **Import certificate**:
   - Double-click your `.ovpn` file
   - Tunnelblick will import it automatically
   - Enter your Mac password when prompted

3. **Connect**:
   - Click the Tunnelblick icon in your menu bar
   - Select your VPN configuration
   - Click "Connect"

### iPhone/iPad

1. **Install OpenVPN Connect** from the App Store

2. **Import certificate**:
   - Email the `.ovpn` file to yourself
   - Open the email on your iPhone/iPad
   - Tap the `.ovpn` attachment
   - Choose "Copy to OpenVPN"

3. **Connect**:
   - Open OpenVPN Connect
   - Tap your profile
   - Tap the connection toggle

### Android

1. **Install OpenVPN for Android** from Google Play Store

2. **Import certificate**:
   - Copy the `.ovpn` file to your phone (email, cloud storage, etc.)
   - Open OpenVPN for Android
   - Tap "+" and select "Import Profile from SD card"
   - Find and select your `.ovpn` file

3. **Connect**:
   - Tap your profile name
   - Tap "Connect"
   - Allow VPN connection when prompted

---

## ✅ Testing Your VPN

### Step 1: Check Your IP Address

1. **Before connecting to VPN**:
   - Go to https://whatismyipaddress.com/
   - Note your current IP address

2. **Connect to your VPN**

3. **Check IP again**:
   - Refresh https://whatismyipaddress.com/
   - Your IP should now show your VPN server's IP
   - Location should show your server's location

### Step 2: Test Internet Access

1. **Browse some websites** to make sure everything works
2. **Try streaming services** (some may block VPN traffic)
3. **Test different apps** on your phone/computer

### Step 3: Speed Test

1. **Run a speed test** at https://speedtest.net/
2. **Compare with and without VPN**
3. **Some speed reduction is normal** (usually 10-30%)

---

## 🔧 Troubleshooting Common Issues

### "Can't connect to server"

**Possible causes:**
- Server is not running
- Firewall blocking connection
- Wrong IP address in configuration

**Solutions:**
1. **Check server status**:
   ```bash
   # Docker
   npm run docker:logs
   
   # Local
   npm start
   ```

2. **Check firewall**:
   - Make sure UDP port 1194 is open
   - Make sure TCP port 3000 is open (for management)

3. **Verify IP address**:
   - Double-check the IP in your `.ovpn` file
   - Make sure it matches your server's IP

### "Authentication failed"

**Possible causes:**
- Certificate is expired or revoked
- Wrong certificate file

**Solutions:**
1. **Generate a new certificate** through the web interface
2. **Download fresh .ovpn file**
3. **Remove old profile** from your VPN client first

### "Connected but no internet"

**Possible causes:**
- DNS issues
- Routing problems

**Solutions:**
1. **Try different DNS servers**:
   - Add to your server's configuration: `8.8.8.8` and `8.8.4.4`
2. **Restart your device**
3. **Disconnect and reconnect** to VPN

### "Web interface won't load"

**Possible causes:**
- Server not running
- Wrong port or IP
- Firewall blocking access

**Solutions:**
1. **Check server logs**:
   ```bash
   npm run docker:logs
   ```
2. **Try different browser**
3. **Check if port 3000 is accessible**:
   ```bash
   telnet YOUR_SERVER_IP 3000
   ```

---

## 🛡️ Security Best Practices

### For Server Administrators

1. **Change default passwords** immediately after setup
2. **Use strong, unique passwords** for admin accounts
3. **Keep the server updated** regularly
4. **Monitor logs** for suspicious activity
5. **Backup certificates** regularly:
   ```bash
   npm run backup:create
   ```

### For VPN Users

1. **Keep your .ovpn files secure** - don't share them
2. **Use different certificates** for each device
3. **Don't email certificates** - use secure file sharing
4. **Report lost devices** immediately so certificates can be revoked
5. **Keep your VPN client updated**

### Network Security

1. **Use firewall rules** to restrict management access
2. **Consider using non-standard ports** for additional security
3. **Enable logging** to monitor connections
4. **Regularly review** connected clients

---

## 📚 What's Next?

### Advanced Configuration

Once your basic VPN is working, you might want to:

1. **Set up automatic backups**
2. **Configure custom DNS servers**
3. **Add multiple server locations**
4. **Set up monitoring and alerts**
5. **Implement certificate auto-renewal**

### Maintenance Tasks

**Weekly:**
- Check server logs for errors
- Verify all family devices can connect

**Monthly:**
- Update server software
- Review connected clients
- Create certificate backups

**As needed:**
- Add certificates for new devices
- Revoke certificates for lost/stolen devices
- Update firewall rules

### Getting Help

If you need help:

1. **Check the logs** first:
   ```bash
   npm run docker:logs
   ```

2. **Run diagnostics**:
   ```bash
   npm test
   ```

3. **Check the troubleshooting guide**: [docs/en/troubleshooting/](docs/en/troubleshooting/)

4. **Review security documentation**: [docs/en/security/](docs/en/security/)

---

## 🎉 Congratulations!

You now have your own private VPN server running! Your family can connect securely from anywhere in the world.

**Remember:**
- Keep your admin credentials secure
- Create separate certificates for each device
- Monitor your server regularly
- Keep everything updated

**Enjoy your private, secure internet connection!** 🔒✨

---

*This guide covers the basics. For advanced configuration and troubleshooting, see the full documentation in the `docs/` folder.*