# Устранение неполадок Windows

Это руководство охватывает специфичные для Windows проблемы и решения для Family VPN Server.

## Проблемы, специфичные для Windows

### Установка OpenVPN

**Ручная установка OpenVPN:**

```powershell
# Скачать OpenVPN с официального сайта
# https://openvpn.net/community-downloads/

# Установка с помощью PowerShell (от имени администратора)
# Скачать установщик
Invoke-WebRequest -Uri "https://swupdate.openvpn.org/community/releases/OpenVPN-2.6.8-I001-amd64.msi" -OutFile "OpenVPN-installer.msi"

# Тихая установка
Start-Process msiexec.exe -Wait -ArgumentList '/I OpenVPN-installer.msi /quiet'

# Проверка установки
Get-Command openvpn
```

**Использование Chocolatey:**

```powershell
# Установка Chocolatey (если не установлен)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Установка OpenVPN
choco install openvpn

# Установка Node.js
choco install nodejs

# Проверка установок
node --version
openvpn --version
```

### Сервисы Windows

**Запуск как сервис Windows:**

```powershell
# Установка node-windows для управления сервисами
npm install -g node-windows

# Создание скрипта установки сервиса
@"
var Service = require('node-windows').Service;

var svc = new Service({
  name:'Family VPN Server',
  description: 'Family VPN Server для управления сертификатами',
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

# Запуск от имени администратора
node install-service.js
```

**Управление сервисами:**

```powershell
# Проверка статуса сервиса
Get-Service "Family VPN Server"

# Запуск сервиса
Start-Service "Family VPN Server"

# Остановка сервиса
Stop-Service "Family VPN Server"

# Перезапуск сервиса
Restart-Service "Family VPN Server"

# Проверка логов сервиса
Get-EventLog -LogName Application -Source "Family VPN Server" -Newest 10
```

### Сетевая конфигурация

**Брандмауэр Windows:**

```powershell
# Проверка статуса брандмауэра Windows
Get-NetFirewallProfile

# Разрешение портов VPN через брандмауэр
New-NetFirewallRule -DisplayName "Family VPN - OpenVPN" -Direction Inbound -Protocol UDP -LocalPort 1194 -Action Allow
New-NetFirewallRule -DisplayName "Family VPN - Web Interface" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Проверка существующих правил
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*VPN*"}

# Удаление правил (при необходимости)
Remove-NetFirewallRule -DisplayName "Family VPN - OpenVPN"
```

**Конфигурация сетевого адаптера:**

```powershell
# Проверка сетевых адаптеров
Get-NetAdapter

# Проверка TAP адаптера (устанавливается с OpenVPN)
Get-NetAdapter | Where-Object {$_.InterfaceDescription -like "*TAP*"}

# Включение TAP адаптера, если отключен
Enable-NetAdapter -Name "TAP-Windows Adapter V9"

# Проверка IP конфигурации
Get-NetIPConfiguration
```

**Конфигурация маршрутизации:**

```powershell
# Проверка таблицы маршрутизации
Get-NetRoute

# Добавление статического маршрута для подсети VPN
New-NetRoute -DestinationPrefix "10.8.0.0/24" -InterfaceAlias "TAP-Windows Adapter V9" -NextHop "10.8.0.1"

# Удаление маршрута
Remove-NetRoute -DestinationPrefix "10.8.0.0/24"

# Включение IP forwarding
Set-NetIPInterface -InterfaceAlias "Ethernet" -Forwarding Enabled
Set-NetIPInterface -InterfaceAlias "TAP-Windows Adapter V9" -Forwarding Enabled
```

### Файловая система и права доступа

**Права доступа к файлам:**

```powershell
# Проверка прав доступа к файлам
Get-Acl "easy-rsa\pki\private" | Format-List

# Установка прав доступа для файлов сертификатов
$acl = Get-Acl "easy-rsa\pki\private"
$acl.SetAccessRuleProtection($true, $false)
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("$env:USERNAME", "FullControl", "Allow")
$acl.SetAccessRule($accessRule)
Set-Acl "easy-rsa\pki\private" $acl

# Скрытие чувствительных файлов
attrib +H "easy-rsa\pki\private\*.key"
```

**Исключения Windows Defender:**

```powershell
# Добавление исключений для каталога VPN
Add-MpPreference -ExclusionPath "C:\path\to\vpn"
Add-MpPreference -ExclusionProcess "node.exe"
Add-MpPreference -ExclusionProcess "openvpn.exe"

# Проверка текущих исключений
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
Get-MpPreference | Select-Object -ExpandProperty ExclusionProcess
```

### Политика выполнения PowerShell

**Проблемы выполнения скриптов:**

```powershell
# Проверка текущей политики выполнения
Get-ExecutionPolicy

# Установка политики выполнения для текущего пользователя
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Установка политики выполнения для локальной машины (требует админ права)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

# Обход политики выполнения для одного скрипта
powershell.exe -ExecutionPolicy Bypass -File "script.ps1"
```

## Управление процессами

### Диспетчер задач и сервисы

**Мониторинг процессов:**

```powershell
# Поиск VPN-связанных процессов
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*openvpn*"}

# Получение подробной информации о процессе
Get-WmiObject Win32_Process | Where-Object {$_.Name -eq "node.exe"} | Select-Object ProcessId, CommandLine

# Завершение процессов
Stop-Process -Name "node" -Force
Stop-Process -Name "openvpn" -Force

# Мониторинг использования ресурсов
Get-Counter "\Process(node)\% Processor Time"
Get-Counter "\Process(node)\Working Set"
```

**Отладка сервиса:**

```powershell
# Проверка конфигурации сервиса
Get-WmiObject Win32_Service | Where-Object {$_.Name -eq "Family VPN Server"}

# Проверка зависимостей сервиса
Get-Service "Family VPN Server" | Select-Object -ExpandProperty ServicesDependedOn

# Просмотр логов сервиса
Get-EventLog -LogName System | Where-Object {$_.Source -eq "Service Control Manager" -and $_.Message -like "*Family VPN*"}
```

## Конфигурация реестра

**Настройки реестра для OpenVPN:**

```powershell
# Проверка настроек реестра OpenVPN
Get-ItemProperty -Path "HKLM:\SOFTWARE\OpenVPN" -ErrorAction SilentlyContinue

# Установка значений реестра (при необходимости)
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenVPN" -Name "config_dir" -Value "C:\path\to\vpn\certificates" -PropertyType String -Force

# Проверка реестра TAP адаптера
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\*" | Where-Object {$_.DriverDesc -like "*TAP*"}
```

## Устранение сетевых неполадок

### Сетевое подключение

**Базовые сетевые тесты:**

```powershell
# Тестирование базового подключения
Test-NetConnection -ComputerName "8.8.8.8" -Port 53

# Тестирование подключения к VPN серверу
Test-NetConnection -ComputerName "localhost" -Port 3000
Test-NetConnection -ComputerName "localhost" -Port 1194 -InformationLevel Detailed

# Проверка разрешения DNS
Resolve-DnsName "google.com"
nslookup google.com
```

**Диагностика сетевого интерфейса:**

```powershell
# Проверка статуса сетевого адаптера
Get-NetAdapter | Format-Table Name, InterfaceDescription, Status, LinkSpeed

# Тестирование сетевого адаптера
Test-NetAdapter -Name "Ethernet"

# Проверка IP конфигурации
Get-NetIPAddress
Get-NetRoute

# Сброс сетевого стека (при необходимости)
netsh winsock reset
netsh int ip reset
```

### Специфичные для Windows сетевые проблемы

**NAT и общий доступ к интернет-соединению:**

```powershell
# Включение общего доступа к интернет-соединению (ICS)
# Это требует ручной настройки через Сетевые подключения

# Проверка статуса ICS
Get-NetConnectionProfile

# Настройка NAT с помощью netsh
netsh routing ip nat install
netsh routing ip nat add interface "Ethernet" full
netsh routing ip nat add interface "TAP-Windows Adapter V9" private
```

**Расположение сети Windows:**

```powershell
# Проверка расположения сети
Get-NetConnectionProfile

# Установка сети как частной (разрешает более мягкие правила брандмауэра)
Set-NetConnectionProfile -InterfaceAlias "Ethernet" -NetworkCategory Private
```

## Оптимизация производительности

### Настройка производительности Windows

**Производительность системы:**

```powershell
# Проверка производительности системы
Get-Counter "\Processor(_Total)\% Processor Time"
Get-Counter "\Memory\Available MBytes"

# Установка приоритета процесса
$process = Get-Process -Name "node"
$process.PriorityClass = "High"

# Проверка производительности диска
Get-Counter "\PhysicalDisk(_Total)\Disk Transfers/sec"
```

**Производительность сети:**

```powershell
# Проверка счетчиков производительности сети
Get-Counter "\Network Interface(*)\Bytes Total/sec"

# Оптимизация настроек TCP
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global chimney=enabled
netsh int tcp set global rss=enabled

# Проверка текущих настроек TCP
netsh int tcp show global
```

## Конфигурация безопасности

### Контроль учетных записей пользователей (UAC)

**UAC и повышение прав:**

```powershell
# Проверка статуса UAC
Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA"

# Запуск команд от имени администратора
Start-Process powershell -Verb RunAs -ArgumentList "-Command", "Your-Command-Here"

# Проверка, запущено ли от имени администратора
([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
```

### Функции безопасности Windows

**Конфигурация Windows Defender:**

```powershell
# Проверка статуса Windows Defender
Get-MpComputerStatus

# Добавление исключений защиты в реальном времени
Add-MpPreference -ExclusionPath "C:\path\to\vpn"
Add-MpPreference -ExclusionExtension ".ovpn"

# Временное отключение защиты в реальном времени (для тестирования)
Set-MpPreference -DisableRealtimeMonitoring $true

# Повторное включение защиты в реальном времени
Set-MpPreference -DisableRealtimeMonitoring $false
```

## Скрипты устранения неполадок Windows

### Диагностический скрипт

```powershell
# Диагностический скрипт Windows VPN
Write-Host "Family VPN Server - Диагностический скрипт Windows" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

# Системная информация
Write-Host "`nСистемная информация:" -ForegroundColor Yellow
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, TotalPhysicalMemory

# Проверка необходимого программного обеспечения
Write-Host "`nПроверка программного обеспечения:" -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js: Не установлен" -ForegroundColor Red
}

try {
    $openvpnVersion = openvpn --version 2>&1 | Select-String "OpenVPN"
    Write-Host "OpenVPN: $openvpnVersion" -ForegroundColor Green
} catch {
    Write-Host "OpenVPN: Не установлен" -ForegroundColor Red
}

# Проверка сервисов
Write-Host "`nСтатус сервисов:" -ForegroundColor Yellow
$vpnService = Get-Service "Family VPN Server" -ErrorAction SilentlyContinue
if ($vpnService) {
    Write-Host "Family VPN Server: $($vpnService.Status)" -ForegroundColor Green
} else {
    Write-Host "Family VPN Server: Не установлен" -ForegroundColor Red
}

# Проверка сетевых адаптеров
Write-Host "`nСетевые адаптеры:" -ForegroundColor Yellow
Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Format-Table Name, InterfaceDescription, LinkSpeed

# Проверка правил брандмауэра
Write-Host "`nПравила брандмауэра:" -ForegroundColor Yellow
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*VPN*"} | Format-Table DisplayName, Direction, Action

# Проверка процессов
Write-Host "`nЗапущенные процессы:" -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*openvpn*"} | Format-Table ProcessName, Id, CPU, WorkingSet

Write-Host "`nДиагностика завершена!" -ForegroundColor Green
```

### Скрипт установки сервиса

```powershell
# Скрипт установки сервиса для Windows
param(
    [Parameter(Mandatory=$true)]
    [string]$VpnPath
)

Write-Host "Установка Family VPN Server как сервиса Windows" -ForegroundColor Green

# Проверка, запущено ли от имени администратора
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Этот скрипт требует прав администратора. Пожалуйста, запустите от имени администратора." -ForegroundColor Red
    exit 1
}

# Установка node-windows, если отсутствует
try {
    npm list -g node-windows 2>$null
} catch {
    Write-Host "Установка node-windows..." -ForegroundColor Yellow
    npm install -g node-windows
}

# Создание скрипта установки сервиса
$serviceScript = @"
var Service = require('node-windows').Service;

var svc = new Service({
  name:'Family VPN Server',
  description: 'Family VPN Server для управления сертификатами и интеграции OpenVPN',
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
  console.log('Сервис успешно установлен');
  svc.start();
});

svc.on('start',function(){
  console.log('Сервис успешно запущен');
});

svc.install();
"@

$serviceScript | Out-File -FilePath "$VpnPath\install-service.js" -Encoding UTF8

# Установка сервиса
Set-Location $VpnPath
node install-service.js

Write-Host "Установка сервиса завершена!" -ForegroundColor Green
```

## Чек-лист устранения неполадок Windows

### Первоначальная диагностика
- [ ] Проверить версию Windows: `Get-ComputerInfo | Select WindowsProductName, WindowsVersion`
- [ ] Проверить установку Node.js: `node --version`
- [ ] Проверить установку OpenVPN: `openvpn --version`
- [ ] Протестировать политику выполнения PowerShell: `Get-ExecutionPolicy`

### Сетевая конфигурация
- [ ] Проверить сетевые адаптеры: `Get-NetAdapter`
- [ ] Проверить TAP адаптер: `Get-NetAdapter | Where-Object {$_.InterfaceDescription -like "*TAP*"}`
- [ ] Проверить правила брандмауэра: `Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*VPN*"}`
- [ ] Протестировать подключение: `Test-NetConnection -ComputerName localhost -Port 3000`

### Управление сервисами
- [ ] Проверить статус сервиса: `Get-Service "Family VPN Server"`
- [ ] Проверить конфигурацию сервиса: `Get-WmiObject Win32_Service | Where-Object {$_.Name -eq "Family VPN Server"}`
- [ ] Проверить логи событий: `Get-EventLog -LogName Application -Source "Family VPN Server" -Newest 5`
- [ ] Мониторить процессы: `Get-Process | Where-Object {$_.ProcessName -like "*node*"}`

### Файловая система и безопасность
- [ ] Проверить права доступа к файлам: `Get-Acl "easy-rsa\pki\private"`
- [ ] Проверить исключения Windows Defender: `Get-MpPreference | Select -ExpandProperty ExclusionPath`
- [ ] Проверить настройки UAC: Права администратора требуются для операций сервиса
- [ ] Протестировать доступ к файлам: Убедиться, что файлы сертификатов читаемы

### Производительность и ресурсы
- [ ] Мониторить системные ресурсы: `Get-Counter "\Processor(_Total)\% Processor Time"`
- [ ] Проверить использование памяти: `Get-Counter "\Memory\Available MBytes"`
- [ ] Мониторить производительность сети: `Get-Counter "\Network Interface(*)\Bytes Total/sec"`
- [ ] Проверить дисковое пространство: `Get-WmiObject -Class Win32_LogicalDisk`

Помните, что Windows имеет другие модели безопасности и управления сервисами по сравнению с Unix-подобными системами. Многие проблемы связаны с UAC, Windows Defender и правами доступа к сервисам. Всегда выполняйте административные задачи с повышенными привилегиями.