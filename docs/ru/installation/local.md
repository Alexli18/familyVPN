# Руководство по локальной установке

Это руководство охватывает установку семейного VPN-сервера непосредственно в вашей системе без Docker. Этот метод обеспечивает лучшую производительность и прямую интеграцию с системой, но требует больше шагов настройки.

## Предварительные требования

Перед началом убедитесь, что у вас есть:
- Выполнены [системные требования](requirements.md)
- Права администратора/root
- Интернет-соединение
- Базовые знания командной строки

## Шаг 1: Установка зависимостей

### Windows

#### Установка Node.js
1. **Скачайте Node.js**:
   - Перейдите на https://nodejs.org/
   - Скачайте LTS версию (рекомендуется 18.x)
   - Запустите установщик с настройками по умолчанию

2. **Проверьте установку**:
   ```cmd
   node --version
   npm --version
   ```

#### Установка OpenVPN
1. **Скачайте OpenVPN**:
   - Перейдите на https://openvpn.net/community-downloads/
   - Скачайте "OpenVPN" (не OpenVPN Connect)
   - Установите с настройками по умолчанию

2. **Проверьте установку**:
   ```cmd
   "C:\Program Files\OpenVPN\bin\openvpn.exe" --version
   ```

#### Установка Git (опционально)
1. **Скачайте Git**:
   - Перейдите на https://git-scm.com/
   - Скачайте и установите Git для Windows
   - Или скачайте проект как ZIP файл

### macOS

#### Установка Homebrew (если не установлен)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Установка зависимостей
```bash
# Установить Node.js, OpenVPN и Easy-RSA
brew install node openvpn easy-rsa git

# Проверить установки
node --version
openvpn --version
```

### Linux (Ubuntu/Debian)

#### Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

#### Установка Node.js
```bash
# Установить Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Проверить установку
node --version
npm --version
```

#### Установка OpenVPN и Easy-RSA
```bash
# Установить OpenVPN и инструменты управления сертификатами
sudo apt install -y openvpn easy-rsa git curl

# Проверить установку
openvpn --version
```

### Linux (CentOS/RHEL/Fedora)

#### Установка Node.js
```bash
# CentOS/RHEL 7-8
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Fedora
sudo dnf install -y nodejs npm

# Проверить установку
node --version
```

#### Установка OpenVPN
```bash
# CentOS/RHEL
sudo yum install -y epel-release
sudo yum install -y openvpn easy-rsa git

# Fedora
sudo dnf install -y openvpn easy-rsa git

# Проверить установку
openvpn --version
```

## Шаг 2: Скачивание и настройка проекта

### Скачивание проекта
```bash
# Вариант A: Клонировать с Git
git clone https://github.com/your-username/family-vpn-server.git
cd family-vpn-server

# Вариант B: Скачать ZIP и извлечь
# Затем перейти в извлеченную папку
```

### Установка зависимостей проекта
```bash
# Установить зависимости Node.js
npm install

# Проверить установку
npm list --depth=0
```

## Шаг 3: Конфигурация системы

### Включение IP Forwarding

#### Linux
```bash
# Включить IP forwarding временно
sudo sysctl -w net.ipv4.ip_forward=1

# Сделать постоянным
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf

# Применить изменения
sudo sysctl -p
```

#### macOS
```bash
# Включить IP forwarding
sudo sysctl -w net.inet.ip.forwarding=1

# Сделать постоянным (добавить в /etc/sysctl.conf)
echo 'net.inet.ip.forwarding=1' | sudo tee -a /etc/sysctl.conf
```

#### Windows
IP forwarding обычно включен по умолчанию в Windows. При необходимости:
```cmd
# Запустить как администратор
netsh interface ipv4 set global forwarding=enabled
```

### Настройка устройства TUN/TAP

#### Linux
```bash
# Загрузить модуль TUN
sudo modprobe tun

# Проверить существование устройства TUN
ls -la /dev/net/tun

# Сделать загрузку модуля TUN при загрузке
echo 'tun' | sudo tee -a /etc/modules
```

#### macOS
Поддержка TUN/TAP включена в установку OpenVPN.

#### Windows
Драйвер TUN/TAP устанавливается с OpenVPN.

## Шаг 4: Запуск мастера настройки

### Интерактивная настройка
```bash
# Запустить мастер настройки
npm run setup

# Следуйте подсказкам:
# 1. Выберите тип установки (системная или пользовательская)
# 2. Настройте директории
# 3. Установите сетевые параметры
```

### Варианты настройки

#### Вариант 1: Системная установка (рекомендуется для серверов)
- **Требует**: Права администратора/root
- **Расположение конфигурации**: `/etc/openvpn` (Linux/macOS) или `C:\ProgramData\OpenVPN` (Windows)
- **Преимущества**: Стандартные расположения, интеграция системных сервисов
- **Случай использования**: Выделенные серверы, продакшн развертывания

#### Вариант 2: Пользовательская установка (рекомендуется для разработки)
- **Требует**: Права обычного пользователя
- **Расположение конфигурации**: `~/.privatevpn/` (все платформы)
- **Преимущества**: Не нужны права администратора, изолировано от системы
- **Случай использования**: Разработка, тестирование, личное использование

### Пример сессии настройки
```bash
$ npm run setup

Setting up PrivateVPN environment...
Detected platform: linux

Would you like to:
1) Use system directories (requires admin/sudo privileges)
2) Use local directories in your home folder (recommended)

Enter your choice (1 or 2): 2

Using local directory: /home/user/.privatevpn
Created .env file with local paths
Creating configuration directories...
✅ Directories created successfully!
✅ Hardened OpenVPN config created
✅ Found OpenVPN at: /usr/bin/openvpn
✅ Found Easy-RSA at: /usr/share/easy-rsa
✅ Created/updated config.js with your selected paths

✅ Setup completed successfully!

Configuration directory: /home/user/.privatevpn/config
Certificates directory: /home/user/.privatevpn/certificates
```

## Шаг 5: Настройка аутентификации

### Создание учетных данных администратора
```bash
# Настроить аутентификацию администратора
npm run setup-auth

# Следуйте подсказкам для создания:
# - Имени пользователя администратора
# - Безопасного пароля
# - JWT секретов
```

### Пример настройки аутентификации
```bash
$ npm run setup-auth

🔐 VPN Server Authentication Setup

Enter admin username: admin
Enter admin password: [безопасный пароль]
Confirm password: [безопасный пароль]

✅ Password hash generated
✅ JWT secrets generated
✅ Authentication configuration saved to .env

Admin credentials created successfully!
Username: admin
Configuration saved to: .env
```

## Шаг 6: Инициализация PKI (система сертификатов)

### Создание центра сертификации
```bash
# Инициализировать PKI инфраструктуру
npm run init-pki

# Это создает:
# - Центр сертификации (CA)
# - Серверные сертификаты
# - Параметры Diffie-Hellman
```

### Процесс инициализации PKI
```bash
$ npm run init-pki

🔐 Initializing PKI infrastructure...

Creating Certificate Authority...
✅ CA certificate created
✅ CA private key secured

Generating server certificates...
✅ Server certificate created
✅ Server private key secured

Generating Diffie-Hellman parameters...
✅ DH parameters generated (this may take several minutes)

Creating TLS-Auth key...
✅ TLS-Auth key generated

✅ PKI initialization completed successfully!

Certificate files created:
- CA Certificate: certificates/ca.crt
- Server Certificate: certificates/server.crt
- Server Key: certificates/server.key
- DH Parameters: certificates/dh.pem
- TLS-Auth Key: certificates/ta.key
```

## Шаг 7: Усиление безопасности

### Применение конфигурации безопасности
```bash
# Применить усиление безопасности
npm run harden-config

# Это настраивает:
# - Сильные настройки шифрования
# - Безопасные параметры OpenVPN
# - Настройки, дружественные к брандмауэру
```

### Настройка системного брандмауэра

#### Linux (UFW)
```bash
# Включить брандмауэр
sudo ufw enable

# Разрешить трафик OpenVPN
sudo ufw allow 1194/udp

# Разрешить интерфейс управления (ограничить для вашего IP)
sudo ufw allow from YOUR_ADMIN_IP to any port 3000

# Разрешить SSH (если удаленный сервер)
sudo ufw allow ssh

# Проверить статус
sudo ufw status
```

#### Linux (iptables)
```bash
# Разрешить OpenVPN
sudo iptables -A INPUT -p udp --dport 1194 -j ACCEPT

# Разрешить интерфейс управления
sudo iptables -A INPUT -p tcp --dport 3000 -s YOUR_ADMIN_IP -j ACCEPT

# Разрешить установленные соединения
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Сохранить правила (Ubuntu/Debian)
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

#### macOS
```bash
# Брандмауэр macOS обычно управляется через Системные настройки
# Или используйте pfctl для расширенной конфигурации

# Разрешить OpenVPN через брандмауэр macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/sbin/openvpn
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/sbin/openvpn
```

#### Windows
```cmd
# Запустить как администратор
# Разрешить OpenVPN через брандмауэр Windows
netsh advfirewall firewall add rule name="OpenVPN" dir=in action=allow protocol=UDP localport=1194

# Разрешить интерфейс управления
netsh advfirewall firewall add rule name="VPN Management" dir=in action=allow protocol=TCP localport=3000
```

## Шаг 8: Запуск сервера

### Режим разработки
```bash
# Запустить в режиме разработки (с автоперезагрузкой)
npm run dev

# Сервер запустится на http://localhost:3000
```

### Продакшн режим
```bash
# Запустить в продакшн режиме
npm start

# Или запустить как фоновый сервис (Linux/macOS)
nohup npm start > vpn-server.log 2>&1 &
```

### Настройка системного сервиса (Linux)

#### Создание systemd сервиса
```bash
# Создать файл сервиса
sudo tee /etc/systemd/system/family-vpn.service > /dev/null <<EOF
[Unit]
Description=Family VPN Server
After=network.target

[Service]
Type=simple
User=vpnuser
WorkingDirectory=/path/to/family-vpn-server
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Создать пользователя VPN
sudo useradd -r -s /bin/false vpnuser
sudo chown -R vpnuser:vpnuser /path/to/family-vpn-server

# Включить и запустить сервис
sudo systemctl daemon-reload
sudo systemctl enable family-vpn
sudo systemctl start family-vpn

# Проверить статус
sudo systemctl status family-vpn
```

## Шаг 9: Проверка установки

### Проверка статуса сервиса
```bash
# Тестировать веб-интерфейс
curl -k http://localhost:3000/health

# Проверить процесс OpenVPN
ps aux | grep openvpn

# Проверить прослушиваемые порты
netstat -tulnp | grep -E '(1194|3000)'
```

### Доступ к веб-интерфейсу
1. **Откройте браузер** и перейдите на `http://localhost:3000`
2. **Войдите** с созданными учетными данными администратора
3. **Проверьте**, что интерфейс управления загружается корректно

### Тестирование генерации сертификатов
```bash
# Генерировать тестовый клиентский сертификат
npm run generate-client

# Следуйте подсказкам для создания тестового сертификата
# Проверьте, что .ovpn файл создан в директории certificates
```

## Шаг 10: Генерация клиентских сертификатов

### Использование веб-интерфейса
1. **Доступ** к `http://localhost:3000`
2. **Войдите** с учетными данными администратора
3. **Нажмите "Generate New Certificate"**
4. **Введите имя клиента** (например, "john-laptop")
5. **Скачайте .ovpn файл**

### Использование командной строки
```bash
# Генерировать клиентский сертификат интерактивно
npm run generate-client

# Или генерировать с конкретным именем
CLIENT_NAME="mary-phone" npm run generate-client
```

## Файлы конфигурации

### Основная конфигурация (.env)
```env
# Конфигурация сервера
VPN_HOST=YOUR_SERVER_IP
VPN_PORT=1194
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Веб-интерфейс
API_PORT=3000
NODE_ENV=production

# Аутентификация
VPN_USERNAME=admin
VPN_PASSWORD_HASH=generated_hash_here
JWT_SECRET=generated_secret_here
SESSION_SECRET=generated_secret_here

# Пути (установлены мастером настройки)
VPN_CONFIG_DIR=/path/to/config
VPN_CERT_DIR=/path/to/certificates

# Безопасность
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=900000
ENFORCE_IP_VALIDATION=false

# Логирование
LOG_LEVEL=info
```

### Конфигурация OpenVPN
Мастер настройки создает усиленную конфигурацию OpenVPN в:
- **Системная**: `/etc/openvpn/openvpn.conf`
- **Пользовательская**: `~/.privatevpn/config/openvpn.conf`

Ключевые функции безопасности:
- Шифрование AES-256-GCM
- Аутентификация SHA-256
- Perfect Forward Secrecy
- Защита TLS-Auth
- Сильные параметры DH

## Устранение неполадок

### Общие проблемы

#### "Доступ запрещен" при запуске
```bash
# Проверить разрешения файлов
ls -la /path/to/certificates/

# Исправить разрешения при необходимости
sudo chown -R $USER:$USER /path/to/family-vpn-server
chmod 600 certificates/*.key
chmod 644 certificates/*.crt
```

#### "OpenVPN не найден"
```bash
# Проверить установку OpenVPN
which openvpn
openvpn --version

# Установить если отсутствует (см. Шаг 1)
```

#### "Порт уже используется"
```bash
# Проверить что использует порт
sudo netstat -tulnp | grep 3000

# Убить конфликтующий процесс или изменить порт в .env
```

#### "Не могу привязаться к VPN порту"
```bash
# Проверить доступность порта 1194
sudo netstat -ulnp | grep 1194

# Запустить с sudo если используется привилегированный порт
sudo npm start
```

### Режим отладки
```bash
# Запустить с отладочным логированием
DEBUG=* LOG_LEVEL=debug npm start

# Проверить логи
tail -f logs/application.log
tail -f logs/error.log
```

### Расположения логов
- **Логи приложения**: `logs/application.log`
- **Логи ошибок**: `logs/error.log`
- **Логи безопасности**: `logs/security.log`
- **Логи OpenVPN**: `/var/log/openvpn/` (системная) или `logs/openvpn.log` (пользовательская)

## Обслуживание

### Регулярные задачи
```bash
# Обновить зависимости
npm update

# Резервное копирование сертификатов
npm run backup:create

# Проверить безопасность
npm run security-scan

# Обновить системные пакеты
sudo apt update && sudo apt upgrade  # Linux
brew upgrade  # macOS
```

### Управление сертификатами
```bash
# Список сертификатов
ls -la certificates/

# Отозвать сертификат
npm run revoke-client CLIENT_NAME

# Обновить серверный сертификат
npm run fix-server-cert
```

## Следующие шаги

После успешной локальной установки:

1. **[Конфигурация окружения](../configuration/environment.md)**
2. **[Конфигурация безопасности](../configuration/security.md)**
3. **[Конфигурация сети](../configuration/networking.md)**
4. **[Управление сертификатами](../configuration/certificates.md)**

## Оптимизация производительности

### Настройка системы
```bash
# Увеличить лимиты файловых дескрипторов
echo '* soft nofile 65536' | sudo tee -a /etc/security/limits.conf
echo '* hard nofile 65536' | sudo tee -a /etc/security/limits.conf

# Оптимизировать сетевые параметры
echo 'net.core.rmem_max = 134217728' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max = 134217728' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Оптимизация OpenVPN
```bash
# Редактировать конфигурацию OpenVPN для лучшей производительности
# Добавить в openvpn.conf:
# fast-io
# sndbuf 393216
# rcvbuf 393216
```

Это завершает руководство по локальной установке. Сервер теперь должен работать и быть готов принимать VPN соединения.