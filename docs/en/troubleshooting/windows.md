# Windows Troubleshooting

This guide covers Windows-specific issues and solutions for the Family VPN Server.

## Windows-Specific Issues

### OpenVPN Installation

**Manual OpenVPN Installation:**

```powershell
# Download OpenVPN from official website
# https://openvpn.net/community-downloads/

# Install using PowerShell (as Administrator)
# Download installer
Invoke-WebRequest -Uri "https://swupdate.openvpn.org/community/releases/OpenVPN-2.6.8-I001-amd64.msi" -OutFile "OpenVPN-installer.msi"

# Install silently
Start-Process msiexec.exe -Wait -ArgumentList '/I OpenVPN-installer.msi /quiet'

# Verify installation
Get-Command openvpn
```

**Using Chocolatey:**

```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install OpenVPN
choco install openvpn

# Install Node.js
choco install nodejs

# Verify installations
node --version
openvpn --version
```

### Windows Services

**Running as Windows Service:**

```powershell
# Install node-windows for service management
npm install -g node-windows

# Create service installation script
@"
var Service = require('node-windows').Service;

var svc = new Service({
  name:'Family VPN Server',
  description: 'Family VPN Server for certificate management',
  script: 'C:\\path\\to\\vpn\\server.js',
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

svc.on('install',function(){
  svc.start();
});

svc.install();
"@ | Out-File -FilePath install-service.js

# Run as Administrator
node install-service.js
```

**Service Management:**

```powershell
# Check service status
Get-Service "Family VPN Server"

# Start service
Start-Service "Family VPN Server"

# Stop service
Stop-Service "Family VPN Server"

# Restart service
Restart-Service "Family VPN Server"

# Check service logs
Get-EventLog -LogName Application -Source "Family VPN Server" -Newest 10
```

### Network Configuration

**Windows Firewall:**

```powershell
# Check Windows Firewall status
Get-NetFirewallProfile

# Allow VPN ports through firewall
New-NetFirewallRule -DisplayName "Family VPN - OpenVPN" -Direction Inbound -Protocol UDP -LocalPort 1194 -Action Allow
New-NetFirewallRule -DisplayName "Family VPN - Web Interface" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Check existing rules
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*VPN*"}

# Remove rules (if needed)
Remove-NetFirewallRule -DisplayName "Family VPN - OpenVPN"
```

**Network Adapter Configuration:**

```powershell
# Check network adapters
Get-NetAdapter

# Check TAP adapter (installed with OpenVPN)
Get-NetAdapter | Where-Object {$_.InterfaceDescription -like "*TAP*"}

# Enable TAP adapter if disabled
Enable-NetAdapter -Name "TAP-Windows Adapter V9"

# Check IP configuration
Get-NetIPConfiguration
```

**Routing Configuration:**

```powershell
# Check routing table
Get-NetRoute

# Add static route for VPN subnet
New-NetRoute -DestinationPrefix "10.8.0.0/24" -InterfaceAlias "TAP-Windows Adapter V9" -NextHop "10.8.0.1"

# Remove route
Remove-NetRoute -DestinationPrefix "10.8.0.0/24"

# Enable IP forwarding
Set-NetIPInterface -InterfaceAlias "Ethernet" -Forwarding Enabled
Set-NetIPInterface -InterfaceAlias "TAP-Windows Adapter V9" -Forwarding Enabled
```

### File System and Permissions

**File Permissions:**

```powershell
# Check file permissions
Get-Acl "easy-rsa\pki\private" | Format-List

# Set permissions for certificate files
$acl = Get-Acl "easy-rsa\pki\private"
$acl.SetAccessRuleProtection($true, $false)
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("$env:USERNAME", "FullControl", "Allow")
$acl.SetAccessRule($accessRule)
Set-Acl "easy-rsa\pki\private" $acl

# Hide sensitive files
attrib +H "easy-rsa\pki\private\*.key"
```

**Windows Defender Exclusions:**

```powershell
# Add exclusions for VPN directory
Add-MpPreference -ExclusionPath "C:\path\to\vpn"
Add-MpPreference -ExclusionProcess "node.exe"
Add-MpPreference -ExclusionProcess "openvpn.exe"

# Check current exclusions
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
Get-MpPreference | Select-Object -ExpandProperty ExclusionProcess
```

### PowerShell Execution Policy

**Script Execution Issues:**

```powershell
# Check current execution policy
Get-ExecutionPolicy

# Set execution policy for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Set execution policy for local machine (requires admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

# Bypass execution policy for single script
powershell.exe -ExecutionPolicy Bypass -File "script.ps1"
```

## Process Management

### Task Manager and Services

**Process Monitoring:**

```powershell
# Find VPN-related processes
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*openvpn*"}

# Get detailed process information
Get-WmiObject Win32_Process | Where-Object {$_.Name -eq "node.exe"} | Select-Object ProcessId, CommandLine

# Kill processes
Stop-Process -Name "node" -Force
Stop-Process -Name "openvpn" -Force

# Monitor resource usage
Get-Counter "\Process(node)\% Processor Time"
Get-Counter "\Process(node)\Working Set"
```

**Service Debugging:**

```powershell
# Check service configuration
Get-WmiObject Win32_Service | Where-Object {$_.Name -eq "Family VPN Server"}

# Check service dependencies
Get-Service "Family VPN Server" | Select-Object -ExpandProperty ServicesDependedOn

# View service logs
Get-EventLog -LogName System | Where-Object {$_.Source -eq "Service Control Manager" -and $_.Message -like "*Family VPN*"}
```

## Registry Configuration

**Registry Settings for OpenVPN:**

```powershell
# Check OpenVPN registry settings
Get-ItemProperty -Path "HKLM:\SOFTWARE\OpenVPN" -ErrorAction SilentlyContinue

# Set registry values (if needed)
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenVPN" -Name "config_dir" -Value "C:\path\to\vpn\certificates" -PropertyType String -Force

# Check TAP adapter registry
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\*" | Where-Object {$_.DriverDesc -like "*TAP*"}
```

## Network Troubleshooting

### Network Connectivity

**Basic Network Tests:**

```powershell
# Test basic connectivity
Test-NetConnection -ComputerName "8.8.8.8" -Port 53

# Test VPN server connectivity
Test-NetConnection -ComputerName "localhost" -Port 3000
Test-NetConnection -ComputerName "localhost" -Port 1194 -InformationLevel Detailed

# Check DNS resolution
Resolve-DnsName "google.com"
nslookup google.com
```

**Network Interface Diagnostics:**

```powershell
# Check network adapter status
Get-NetAdapter | Format-Table Name, InterfaceDescription, Status, LinkSpeed

# Test network adapter
Test-NetAdapter -Name "Ethernet"

# Check IP configuration
Get-NetIPAddress
Get-NetRoute

# Reset network stack (if needed)
netsh winsock reset
netsh int ip reset
```

### Windows-Specific Network Issues

**NAT and Internet Connection Sharing:**

```powershell
# Enable Internet Connection Sharing (ICS)
# This requires manual configuration through Network Connections

# Check ICS status
Get-NetConnectionProfile

# Configure NAT using netsh
netsh routing ip nat install
netsh routing ip nat add interface "Ethernet" full
netsh routing ip nat add interface "TAP-Windows Adapter V9" private
```

**Windows Network Location:**

```powershell
# Check network location
Get-NetConnectionProfile

# Set network to private (allows more permissive firewall rules)
Set-NetConnectionProfile -InterfaceAlias "Ethernet" -NetworkCategory Private
```

## Performance Optimization

### Windows Performance Tuning

**System Performance:**

```powershell
# Check system performance
Get-Counter "\Processor(_Total)\% Processor Time"
Get-Counter "\Memory\Available MBytes"

# Set process priority
$process = Get-Process -Name "node"
$process.PriorityClass = "High"

# Check disk performance
Get-Counter "\PhysicalDisk(_Total)\Disk Transfers/sec"
```

**Network Performance:**

```powershell
# Check network performance counters
Get-Counter "\Network Interface(*)\Bytes Total/sec"

# Optimize TCP settings
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global chimney=enabled
netsh int tcp set global rss=enabled

# Check current TCP settings
netsh int tcp show global
```

## Security Configuration

### User Account Control (UAC)

**UAC and Elevation:**

```powershell
# Check UAC status
Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA"

# Run commands as administrator
Start-Process powershell -Verb RunAs -ArgumentList "-Command", "Your-Command-Here"

# Check if running as administrator
([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
```

### Windows Security Features

**Windows Defender Configuration:**

```powershell
# Check Windows Defender status
Get-MpComputerStatus

# Add real-time protection exclusions
Add-MpPreference -ExclusionPath "C:\path\to\vpn"
Add-MpPreference -ExclusionExtension ".ovpn"

# Disable real-time protection temporarily (for testing)
Set-MpPreference -DisableRealtimeMonitoring $true

# Re-enable real-time protection
Set-MpPreference -DisableRealtimeMonitoring $false
```

## Windows Troubleshooting Scripts

### Diagnostic Script

```powershell
# Windows VPN Diagnostic Script
Write-Host "Family VPN Server - Windows Diagnostic Script" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# System Information
Write-Host "`nSystem Information:" -ForegroundColor Yellow
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, TotalPhysicalMemory

# Check required software
Write-Host "`nSoftware Check:" -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js: Not installed" -ForegroundColor Red
}

try {
    $openvpnVersion = openvpn --version 2>&1 | Select-String "OpenVPN"
    Write-Host "OpenVPN: $openvpnVersion" -ForegroundColor Green
} catch {
    Write-Host "OpenVPN: Not installed" -ForegroundColor Red
}

# Check services
Write-Host "`nService Status:" -ForegroundColor Yellow
$vpnService = Get-Service "Family VPN Server" -ErrorAction SilentlyContinue
if ($vpnService) {
    Write-Host "Family VPN Server: $($vpnService.Status)" -ForegroundColor Green
} else {
    Write-Host "Family VPN Server: Not installed" -ForegroundColor Red
}

# Check network adapters
Write-Host "`nNetwork Adapters:" -ForegroundColor Yellow
Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Format-Table Name, InterfaceDescription, LinkSpeed

# Check firewall rules
Write-Host "`nFirewall Rules:" -ForegroundColor Yellow
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*VPN*"} | Format-Table DisplayName, Direction, Action

# Check processes
Write-Host "`nRunning Processes:" -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*openvpn*"} | Format-Table ProcessName, Id, CPU, WorkingSet

Write-Host "`nDiagnostic completed!" -ForegroundColor Green
```

### Service Installation Script

```powershell
# Service Installation Script for Windows
param(
    [Parameter(Mandatory=$true)]
    [string]$VpnPath
)

Write-Host "Installing Family VPN Server as Windows Service" -ForegroundColor Green

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script requires administrator privileges. Please run as administrator." -ForegroundColor Red
    exit 1
}

# Install node-windows if not present
try {
    npm list -g node-windows 2>$null
} catch {
    Write-Host "Installing node-windows..." -ForegroundColor Yellow
    npm install -g node-windows
}

# Create service installation script
$serviceScript = @"
var Service = require('node-windows').Service;

var svc = new Service({
  name:'Family VPN Server',
  description: 'Family VPN Server for certificate management and OpenVPN integration',
  script: '$VpnPath\\server.js',
  nodeOptions: [
    '--max_old_space_size=2048'
  ],
  env: {
    name: 'NODE_ENV',
    value: 'production'
  }
});

svc.on('install',function(){
  console.log('Service installed successfully');
  svc.start();
});

svc.on('start',function(){
  console.log('Service started successfully');
});

svc.install();
"@

$serviceScript | Out-File -FilePath "$VpnPath\install-service.js" -Encoding UTF8

# Install the service
Set-Location $VpnPath
node install-service.js

Write-Host "Service installation completed!" -ForegroundColor Green
```

## Windows Troubleshooting Checklist

### Initial Diagnosis
- [ ] Check Windows version: `Get-ComputerInfo | Select WindowsProductName, WindowsVersion`
- [ ] Verify Node.js installation: `node --version`
- [ ] Check OpenVPN installation: `openvpn --version`
- [ ] Test PowerShell execution policy: `Get-ExecutionPolicy`

### Network Configuration
- [ ] Check network adapters: `Get-NetAdapter`
- [ ] Verify TAP adapter: `Get-NetAdapter | Where-Object {$_.InterfaceDescription -like "*TAP*"}`
- [ ] Check firewall rules: `Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*VPN*"}`
- [ ] Test connectivity: `Test-NetConnection -ComputerName localhost -Port 3000`

### Service Management
- [ ] Check service status: `Get-Service "Family VPN Server"`
- [ ] Verify service configuration: `Get-WmiObject Win32_Service | Where-Object {$_.Name -eq "Family VPN Server"}`
- [ ] Check event logs: `Get-EventLog -LogName Application -Source "Family VPN Server" -Newest 5`
- [ ] Monitor processes: `Get-Process | Where-Object {$_.ProcessName -like "*node*"}`

### File System and Security
- [ ] Check file permissions: `Get-Acl "easy-rsa\pki\private"`
- [ ] Verify Windows Defender exclusions: `Get-MpPreference | Select -ExpandProperty ExclusionPath`
- [ ] Check UAC settings: Administrator privileges required for service operations
- [ ] Test file access: Ensure certificate files are readable

### Performance and Resources
- [ ] Monitor system resources: `Get-Counter "\Processor(_Total)\% Processor Time"`
- [ ] Check memory usage: `Get-Counter "\Memory\Available MBytes"`
- [ ] Monitor network performance: `Get-Counter "\Network Interface(*)\Bytes Total/sec"`
- [ ] Check disk space: `Get-WmiObject -Class Win32_LogicalDisk`

Remember that Windows has different security models and service management compared to Unix-like systems. Many issues are related to UAC, Windows Defender, and service permissions. Always run administrative tasks with elevated privileges.