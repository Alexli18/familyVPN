# Microsoft Azure Deployment Guide

This guide covers deploying the Family VPN Server on Microsoft Azure using Virtual Machines with proper networking, security, and best practices.

## Prerequisites

- Microsoft Azure account with active subscription
- Azure CLI installed and configured
- Basic understanding of Azure networking concepts
- SSH key pair for VM access

## Quick Start

### 1. Setup Azure Environment

```bash
# Install Azure CLI (if not installed)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set default subscription
az account set --subscription "your-subscription-id"

# Create resource group
az group create --name family-vpn-rg --location eastus
```

### 2. Create Virtual Machine

#### Using Azure CLI

```bash
# Create VM with Ubuntu 20.04
az vm create \
  --resource-group family-vpn-rg \
  --name family-vpn-server \
  --image UbuntuLTS \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --storage-sku Premium_LRS \
  --os-disk-size-gb 30 \
  --tags Environment=Production Application=FamilyVPN

# Get public IP address
az vm show -d -g family-vpn-rg -n family-vpn-server --query publicIps -o tsv
```

#### Using Azure Portal

1. **Navigate to Virtual Machines**
   - Go to Azure Portal → Virtual Machines
   - Click "Create" → "Virtual machine"

2. **Basic Configuration**
   - **Resource Group**: family-vpn-rg
   - **VM Name**: family-vpn-server
   - **Region**: East US (or your preferred region)
   - **Image**: Ubuntu Server 20.04 LTS
   - **Size**: Standard_B2s (2 vCPUs, 4GB RAM)

3. **Administrator Account**
   - **Authentication**: SSH public key
   - **Username**: azureuser
   - **SSH Key**: Use existing or generate new

4. **Inbound Port Rules**
   - Allow: SSH (22), HTTP (80), HTTPS (443)
   - Custom: UDP 1194 (will configure later)

### 3. Configure Network Security Group

```bash
# Create network security group
az network nsg create \
  --resource-group family-vpn-rg \
  --name family-vpn-nsg

# Allow SSH
az network nsg rule create \
  --resource-group family-vpn-rg \
  --nsg-name family-vpn-nsg \
  --name allow-ssh \
  --protocol Tcp \
  --priority 1000 \
  --destination-port-range 22 \
  --access Allow

# Allow OpenVPN
az network nsg rule create \
  --resource-group family-vpn-rg \
  --nsg-name family-vpn-nsg \
  --name allow-openvpn \
  --protocol Udp \
  --priority 1001 \
  --destination-port-range 1194 \
  --access Allow

# Allow HTTPS for web interface (restrict source)
az network nsg rule create \
  --resource-group family-vpn-rg \
  --nsg-name family-vpn-nsg \
  --name allow-https \
  --protocol Tcp \
  --priority 1002 \
  --destination-port-range 443 \
  --source-address-prefix YOUR_ADMIN_IP \
  --access Allow

# Allow HTTP for Let's Encrypt (temporary)
az network nsg rule create \
  --resource-group family-vpn-rg \
  --nsg-name family-vpn-nsg \
  --name allow-http \
  --protocol Tcp \
  --priority 1003 \
  --destination-port-range 80 \
  --access Allow

# Associate NSG with VM
az network nic update \
  --resource-group family-vpn-rg \
  --name family-vpn-serverVMNic \
  --network-security-group family-vpn-nsg
```

### 4. Connect and Setup VM

```bash
# Get VM public IP
VM_IP=$(az vm show -d -g family-vpn-rg -n family-vpn-server --query publicIps -o tsv)

# Connect to VM
ssh azureuser@$VM_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install OpenVPN and dependencies
sudo apt install -y openvpn easy-rsa git curl

# Clone application
git clone <repository-url>
cd family-vpn-server

# Install dependencies
npm install
```

### 5. Configure Environment

```bash
# Get VM public IP
export VPN_HOST=$(curl -s -H Metadata:true \
  "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2017-08-01&format=text")

# Create environment configuration
cp .env.example .env

# Update .env with Azure-specific settings
cat > .env <<EOF
# Network Configuration
VPN_HOST=$VPN_HOST
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Ports
VPN_PORT=1194
API_PORT=3000

# Production Settings
NODE_ENV=production
WEB_HTTPS_ONLY=true

# Security
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=your-bcrypt-hash
WEB_RATE_LIMIT_ENABLED=true
WEB_SESSION_TIMEOUT=1800000

# Paths
VPN_CONFIG_DIR=/etc/openvpn
VPN_CERT_DIR=/etc/openvpn/certificates
EOF
```

### 6. Initialize and Deploy

```bash
# Run setup wizard
npm run setup

# Initialize PKI
npm run init-pki

# Create admin credentials
npm run setup-auth

# Apply security hardening
npm run harden-config

# Start server
npm start
```

## Production Deployment

### 1. Static Public IP

Reserve a static public IP address:

```bash
# Create static public IP
az network public-ip create \
  --resource-group family-vpn-rg \
  --name family-vpn-ip \
  --sku Standard \
  --allocation-method Static

# Get the IP address
az network public-ip show \
  --resource-group family-vpn-rg \
  --name family-vpn-ip \
  --query ipAddress -o tsv

# Associate with VM
az network nic ip-config update \
  --resource-group family-vpn-rg \
  --nic-name family-vpn-serverVMNic \
  --name ipconfigfamily-vpn-server \
  --public-ip-address family-vpn-ip
```

### 2. SSL Certificate Setup

#### Using Let's Encrypt

```bash
# Install certbot
sudo apt install certbot

# Stop any running web server
sudo systemctl stop family-vpn

# Generate certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com

# Update .env with SSL paths
echo "SSL_CERT=/etc/letsencrypt/live/your-domain.com/fullchain.pem" >> .env
echo "SSL_KEY=/etc/letsencrypt/live/your-domain.com/privkey.pem" >> .env

# Set up automatic renewal
echo "0 3 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

#### Using Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name family-vpn-kv \
  --resource-group family-vpn-rg \
  --location eastus

# Import certificate (if you have one)
az keyvault certificate import \
  --vault-name family-vpn-kv \
  --name vpn-ssl-cert \
  --file certificate.pfx
```

### 3. Systemd Service Configuration

```bash
# Create systemd service
sudo tee /etc/systemd/system/family-vpn.service > /dev/null <<EOF
[Unit]
Description=Family VPN Server
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/home/azureuser/family-vpn-server
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/azureuser/family-vpn-server

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable family-vpn
sudo systemctl start family-vpn
sudo systemctl status family-vpn
```

## Azure-Specific Features

### 1. Azure Monitor Integration

```bash
# Install Azure Monitor agent
wget https://aka.ms/azcmagent -O ~/install_linux_azcmagent.sh
bash ~/install_linux_azcmagent.sh

# Configure monitoring
az monitor log-analytics workspace create \
  --resource-group family-vpn-rg \
  --workspace-name family-vpn-workspace

# Get workspace ID and key
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group family-vpn-rg \
  --workspace-name family-vpn-workspace \
  --query customerId -o tsv)

WORKSPACE_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group family-vpn-rg \
  --workspace-name family-vpn-workspace \
  --query primarySharedKey -o tsv)

# Install and configure Log Analytics agent
wget https://raw.githubusercontent.com/Microsoft/OMS-Agent-for-Linux/master/installer/scripts/onboard_agent.sh
sudo sh onboard_agent.sh -w $WORKSPACE_ID -s $WORKSPACE_KEY
```

### 2. Application Insights

```bash
# Create Application Insights resource
az monitor app-insights component create \
  --app family-vpn-insights \
  --location eastus \
  --resource-group family-vpn-rg

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app family-vpn-insights \
  --resource-group family-vpn-rg \
  --query instrumentationKey -o tsv)

# Add to environment
echo "APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY" >> .env
```

### 3. Azure Backup

```bash
# Create Recovery Services vault
az backup vault create \
  --resource-group family-vpn-rg \
  --name family-vpn-vault \
  --location eastus

# Enable backup for VM
az backup protection enable-for-vm \
  --resource-group family-vpn-rg \
  --vault-name family-vpn-vault \
  --vm family-vpn-server \
  --policy-name DefaultPolicy
```

## High Availability Setup

### 1. Availability Set

```bash
# Create availability set
az vm availability-set create \
  --resource-group family-vpn-rg \
  --name family-vpn-avset \
  --platform-fault-domain-count 2 \
  --platform-update-domain-count 5

# Create VMs in availability set
az vm create \
  --resource-group family-vpn-rg \
  --name family-vpn-server-1 \
  --availability-set family-vpn-avset \
  --image UbuntuLTS \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys

az vm create \
  --resource-group family-vpn-rg \
  --name family-vpn-server-2 \
  --availability-set family-vpn-avset \
  --image UbuntuLTS \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys
```

### 2. Load Balancer

```bash
# Create load balancer
az network lb create \
  --resource-group family-vpn-rg \
  --name family-vpn-lb \
  --sku Standard \
  --public-ip-address family-vpn-ip \
  --frontend-ip-name family-vpn-frontend \
  --backend-pool-name family-vpn-backend

# Create health probe
az network lb probe create \
  --resource-group family-vpn-rg \
  --lb-name family-vpn-lb \
  --name family-vpn-health \
  --protocol Http \
  --port 3000 \
  --path /health

# Create load balancing rule for HTTPS
az network lb rule create \
  --resource-group family-vpn-rg \
  --lb-name family-vpn-lb \
  --name family-vpn-https \
  --protocol Tcp \
  --frontend-port 443 \
  --backend-port 3000 \
  --frontend-ip-name family-vpn-frontend \
  --backend-pool-name family-vpn-backend \
  --probe-name family-vpn-health

# Create load balancing rule for VPN (UDP)
az network lb rule create \
  --resource-group family-vpn-rg \
  --lb-name family-vpn-lb \
  --name family-vpn-udp \
  --protocol Udp \
  --frontend-port 1194 \
  --backend-port 1194 \
  --frontend-ip-name family-vpn-frontend \
  --backend-pool-name family-vpn-backend
```

## Backup and Recovery

### 1. VM Snapshots

```bash
# Create snapshot
az snapshot create \
  --resource-group family-vpn-rg \
  --name family-vpn-snapshot-$(date +%Y%m%d-%H%M%S) \
  --source family-vpn-server_OsDisk_1_$(az vm show -g family-vpn-rg -n family-vpn-server --query storageProfile.osDisk.managedDisk.id -o tsv | cut -d'/' -f9)

# Automated snapshot script
cat > /home/azureuser/backup-snapshot.sh <<EOF
#!/bin/bash
RESOURCE_GROUP="family-vpn-rg"
VM_NAME="family-vpn-server"
DATE=\$(date +%Y%m%d-%H%M%S)

# Get OS disk name
DISK_ID=\$(az vm show -g \$RESOURCE_GROUP -n \$VM_NAME --query storageProfile.osDisk.managedDisk.id -o tsv)
DISK_NAME=\$(echo \$DISK_ID | cut -d'/' -f9)

# Create snapshot
az snapshot create \
  --resource-group \$RESOURCE_GROUP \
  --name family-vpn-snapshot-\$DATE \
  --source \$DISK_NAME

# Keep only last 7 snapshots
az snapshot list --resource-group \$RESOURCE_GROUP \
  --query "[?contains(name, 'family-vpn-snapshot-')].{Name:name, Created:timeCreated}" \
  --output table | tail -n +8 | awk '{print \$1}' | \
  xargs -r -I {} az snapshot delete --resource-group \$RESOURCE_GROUP --name {} --yes
EOF

chmod +x /home/azureuser/backup-snapshot.sh

# Schedule daily snapshots
echo "0 2 * * * /home/azureuser/backup-snapshot.sh" | crontab -
```

### 2. Azure Storage Backup

```bash
# Create storage account
az storage account create \
  --name familyvpnbackup$(date +%s) \
  --resource-group family-vpn-rg \
  --location eastus \
  --sku Standard_LRS

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
  --resource-group family-vpn-rg \
  --account-name familyvpnbackup$(date +%s) \
  --query '[0].value' -o tsv)

# Create backup script
cat > /home/azureuser/backup-storage.sh <<EOF
#!/bin/bash
STORAGE_ACCOUNT="your-storage-account-name"
STORAGE_KEY="your-storage-key"
CONTAINER="vpn-backups"
DATE=\$(date +%Y%m%d_%H%M%S)

# Create container if it doesn't exist
az storage container create \
  --name \$CONTAINER \
  --account-name \$STORAGE_ACCOUNT \
  --account-key \$STORAGE_KEY

# Backup certificates and configuration
tar -czf /tmp/vpn-backup-\$DATE.tar.gz \
  /home/azureuser/family-vpn-server/certificates \
  /home/azureuser/family-vpn-server/easy-rsa/pki \
  /home/azureuser/family-vpn-server/.env \
  /home/azureuser/family-vpn-server/logs

# Upload to Azure Storage
az storage blob upload \
  --file /tmp/vpn-backup-\$DATE.tar.gz \
  --name vpn-backup-\$DATE.tar.gz \
  --container-name \$CONTAINER \
  --account-name \$STORAGE_ACCOUNT \
  --account-key \$STORAGE_KEY

# Clean up local backup
rm /tmp/vpn-backup-\$DATE.tar.gz

# Keep only last 30 backups in storage
az storage blob list \
  --container-name \$CONTAINER \
  --account-name \$STORAGE_ACCOUNT \
  --account-key \$STORAGE_KEY \
  --query "[?contains(name, 'vpn-backup-')].name" -o tsv | \
  sort | head -n -30 | \
  xargs -r -I {} az storage blob delete \
    --name {} \
    --container-name \$CONTAINER \
    --account-name \$STORAGE_ACCOUNT \
    --account-key \$STORAGE_KEY
EOF

chmod +x /home/azureuser/backup-storage.sh

# Schedule daily backups
echo "0 3 * * * /home/azureuser/backup-storage.sh" | crontab -
```

## Security Best Practices

### 1. Azure Security Center

```bash
# Enable Security Center (Standard tier)
az security pricing create \
  --name VirtualMachines \
  --tier Standard

# Enable auto-provisioning
az security auto-provisioning-setting update \
  --name default \
  --auto-provision On
```

### 2. Azure Key Vault Integration

```bash
# Create Key Vault
az keyvault create \
  --name family-vpn-kv \
  --resource-group family-vpn-rg \
  --location eastus

# Store admin password
az keyvault secret set \
  --vault-name family-vpn-kv \
  --name admin-password \
  --value your-secure-password

# Grant VM access to Key Vault
az vm identity assign \
  --resource-group family-vpn-rg \
  --name family-vpn-server

PRINCIPAL_ID=$(az vm show \
  --resource-group family-vpn-rg \
  --name family-vpn-server \
  --query identity.principalId -o tsv)

az keyvault set-policy \
  --name family-vpn-kv \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get
```

### 3. Network Security

```bash
# Create custom VNet
az network vnet create \
  --resource-group family-vpn-rg \
  --name family-vpn-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name family-vpn-subnet \
  --subnet-prefix 10.0.1.0/24

# Create network security group with strict rules
az network nsg create \
  --resource-group family-vpn-rg \
  --name family-vpn-strict-nsg

# Deny all inbound by default, then allow specific ports
az network nsg rule create \
  --resource-group family-vpn-rg \
  --nsg-name family-vpn-strict-nsg \
  --name deny-all-inbound \
  --priority 4000 \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --destination-port-ranges '*'
```

## Cost Optimization

### 1. Reserved Instances

```bash
# Purchase reserved instance (1-year term)
az reservations reservation-order purchase \
  --reservation-order-id your-order-id \
  --sku Standard_B2s \
  --location eastus \
  --term P1Y \
  --billing-scope /subscriptions/your-subscription-id \
  --quantity 1
```

### 2. Auto-shutdown

```bash
# Configure auto-shutdown
az vm auto-shutdown \
  --resource-group family-vpn-rg \
  --name family-vpn-server \
  --time 2300 \
  --email your-email@domain.com
```

### 3. Spot Instances

For development environments:

```bash
# Create spot instance
az vm create \
  --resource-group family-vpn-rg \
  --name family-vpn-spot \
  --image UbuntuLTS \
  --size Standard_B2s \
  --priority Spot \
  --max-price 0.05 \
  --eviction-policy Deallocate \
  --admin-username azureuser \
  --generate-ssh-keys
```

## Monitoring and Alerting

### 1. Custom Metrics

```bash
# Create action group for alerts
az monitor action-group create \
  --resource-group family-vpn-rg \
  --name family-vpn-alerts \
  --short-name vpn-alerts \
  --email admin your-email@domain.com

# Create CPU alert
az monitor metrics alert create \
  --name "High CPU Usage" \
  --resource-group family-vpn-rg \
  --scopes /subscriptions/your-subscription-id/resourceGroups/family-vpn-rg/providers/Microsoft.Compute/virtualMachines/family-vpn-server \
  --condition "avg Percentage CPU > 80" \
  --action family-vpn-alerts \
  --description "Alert when CPU usage is high"
```

### 2. Log Analytics Queries

```kusto
// VPN connection monitoring
Syslog
| where Computer == "family-vpn-server"
| where SyslogMessage contains "OpenVPN"
| summarize count() by bin(TimeGenerated, 1h)

// Error monitoring
Syslog
| where Computer == "family-vpn-server"
| where SeverityLevel == "err"
| project TimeGenerated, SyslogMessage
```

## Troubleshooting

### Common Azure Issues

#### Metadata Service

```bash
# Test Azure metadata service
curl -H Metadata:true \
  "http://169.254.169.254/metadata/instance?api-version=2021-02-01&format=json"
```

#### Network Connectivity

```bash
# Test network security group rules
az network nsg rule list \
  --resource-group family-vpn-rg \
  --nsg-name family-vpn-nsg \
  --output table

# Test effective security group rules
az network nic list-effective-nsg \
  --resource-group family-vpn-rg \
  --name family-vpn-serverVMNic
```

#### VM Performance

```bash
# Check VM metrics
az monitor metrics list \
  --resource /subscriptions/your-subscription-id/resourceGroups/family-vpn-rg/providers/Microsoft.Compute/virtualMachines/family-vpn-server \
  --metric "Percentage CPU" \
  --interval PT1M

# VM diagnostics
az vm boot-diagnostics get-boot-log \
  --resource-group family-vpn-rg \
  --name family-vpn-server
```

## Related Documentation

- [Production Best Practices](production.md) - Security and monitoring
- [Docker Deployment](docker.md) - Alternative containerized deployment
- [Configuration Guide](../configuration/README.md) - Environment configuration
- [Security Guide](../security/README.md) - Security hardening