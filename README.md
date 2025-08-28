# Family VPN Server / Семейный VPN Сервер

🌐 **Language**: [English](#english) | [Русский](#русский)

## 📚 Documentation Navigation

### 🚀 Quick Start
- **[📖 First Time Setup](FIRST_TIME.md)** | **[📖 Первоначальная настройка](FIRST_TIME_RU.md)**

### 📋 Documentation Sections
| English | Русский | Description |
|---------|---------|-------------|
| [📚 Documentation](docs/en/) | [📚 Документация](docs/ru/) | Complete documentation |
| [🔧 Installation](docs/en/installation/) | [🔧 Установка](docs/ru/installation/) | Installation guides |
| [🚀 Deployment](docs/en/deployment/) | [🚀 Развертывание](docs/ru/deployment/) | Platform deployment |
| [⚙️ Configuration](docs/en/configuration/) | [⚙️ Конфигурация](docs/ru/configuration/) | System configuration |
| [🛡️ Security](docs/en/security/) | [🛡️ Безопасность](docs/ru/security/) | Security documentation |
| [🔌 API Reference](docs/en/api/) | [🔌 API Справочник](docs/ru/api/) | API documentation |
| [❓ Troubleshooting](docs/en/troubleshooting/) | [❓ Устранение неполадок](docs/ru/troubleshooting/) | Problem resolution |

### 👥 User Guides
- **[👤 User Guide](docs/en/installation/user-guide.md)** | **[👤 Руководство пользователя](docs/ru/installation/user-guide.md)**
- **[📱 Client Setup](docs/en/installation/client-setup.md)** | **[📱 Настройка клиентов](docs/ru/installation/client-setup.md)**

[English](#english) | [Русский](#русский)

---

## English

### Overview

A secure, private OpenVPN server designed for family use with enterprise-grade security features. This solution provides a complete VPN infrastructure with automated certificate management, web-based administration, and comprehensive security hardening.

### Key Features

- **🔐 Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **📜 Certificate Management**: Automated PKI with Easy-RSA integration
- **🛡️ Security Hardening**: Firewall rules, rate limiting, and intrusion prevention
- **🌐 Web Interface**: Simple web portal for certificate download and management
- **🐳 Docker Support**: Containerized deployment with proper network privileges
- **📊 Monitoring**: Comprehensive logging and security event tracking
- **🔄 Backup System**: Automated certificate and configuration backups

## 🚀 Quick Links

- **[📖 First Time Setup](FIRST_TIME.md)** - Complete setup guide for beginners
- **[📚 Documentation](docs/)** - Comprehensive documentation
- **[🔧 API Reference](docs/en/api/)** - API documentation and examples
- **[🛡️ Security Guide](docs/en/security/)** - Security documentation and best practices
- **[🚀 Deployment Guides](docs/en/deployment/)** - Platform-specific deployment instructions
- **[❓ Troubleshooting](docs/en/troubleshooting/)** - Problem resolution guides

### Quick Start

#### Prerequisites
- Node.js 12.0.0+
- OpenVPN (system installation)
- macOS, Linux, Windows, or Docker
- Root/Administrator privileges for network configuration

#### Installation and Setup

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd family-vpn-server
npm install

# 2. Initial setup
npm run setup          # Interactive setup wizard
npm run setup-auth     # Create admin credentials
npm run init-pki       # Initialize PKI infrastructure

# 3. Security hardening
npm run harden-config  # Apply security configurations
npm run firewall:init  # Setup firewall rules

# 4. Start the server
npm start
```

#### Docker Deployment

```bash
# Quick deployment
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### For Developers

#### Project Structure

```
family-vpn-server/
├── src/                    # Source code
│   ├── server.js          # Main application
│   ├── config.js          # Configuration management
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic services
│   └── utils/             # Utility modules
├── scripts/               # Automation scripts
│   ├── setup.js          # Setup wizard
│   ├── generate-client.js # Certificate generation
│   └── security-scan.js   # Security scanning
├── test/                  # Test suites
├── easy-rsa/             # PKI management
├── logs/                 # Application logs
└── certificate-backups/  # Backup storage
```

#### Development Commands

```bash
# Development server with auto-reload
npm run dev

# Run all tests
npm test

# Individual test suites
npm run test:auth          # Authentication tests
npm run test:security      # Security feature tests
npm run test:cert-manager  # Certificate management tests
npm run test:network-security  # Network security tests

# Security scanning
npm run security-scan      # Full security audit
npm run network-security   # Network configuration check
```

#### API Documentation

For complete API documentation, see [docs/en/api/](docs/en/api/):
- [Authentication API](docs/en/api/authentication.md) - Login, logout, and token management
- [Certificate Management API](docs/en/api/certificates.md) - Generate and manage client certificates
- [System API](docs/en/api/system.md) - Health checks and system monitoring
- [API Examples](docs/en/api/examples.md) - Code examples in multiple languages

#### Configuration

Environment variables in `.env`:

```env
# Server Configuration
VPN_HOST=your-server-ip
VPN_PORT=1194
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0
API_PORT=3000

# Authentication
VPN_USERNAME=admin
VPN_PASSWORD_HASH=bcrypt_hash_here
JWT_SECRET=secure_random_secret
JWT_REFRESH_SECRET=secure_refresh_secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security Settings
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=900000
ENFORCE_IP_VALIDATION=false

# Paths
VPN_CONFIG_DIR=/etc/openvpn
VPN_CERT_DIR=/etc/openvpn/certificates
```

#### Deployment Options

##### Local Installation

```bash
# System-wide installation (requires root)
sudo npm run setup
sudo npm start

# User-local installation
VPN_CONFIG_DIR=~/.privatevpn/config npm run setup
VPN_CONFIG_DIR=~/.privatevpn/config npm start
```

##### Docker Deployment

```bash
# Build custom image
docker build -t family-vpn-server .

# Run with docker-compose
docker-compose up -d

# Manual docker run
docker run -d \
  --name family-vpn-server \
  --cap-add=NET_ADMIN \
  --device /dev/net/tun \
  -p 1194:1194/udp \
  -p 3000:3000 \
  -v $(pwd)/certificates:/app/certificates \
  family-vpn-server
```

##### Cloud Deployment

For detailed cloud deployment guides, see [docs/en/deployment/](docs/en/deployment/):
- [AWS Deployment](docs/en/deployment/aws.md) - Amazon Web Services
- [Google Cloud Deployment](docs/en/deployment/gcp.md) - Google Cloud Platform
- [Azure Deployment](docs/en/deployment/azure.md) - Microsoft Azure
- [DigitalOcean Deployment](docs/en/deployment/digitalocean.md) - DigitalOcean
- [Production Best Practices](docs/en/deployment/production.md) - Security and monitoring

### For Users

#### Getting Your VPN Certificate

##### Method 1: Web Interface

1. **Access the Management Portal**:
   - Open your browser and go to `https://your-server-ip:3000`
   - Login with the admin credentials provided by your administrator

2. **Generate Certificate**:
   - Click "Generate New Certificate"
   - Enter a unique client name (e.g., "john-laptop", "mary-phone")
   - Click "Generate"

3. **Download Configuration**:
   - Download the `.ovpn` file
   - Save it to your device

##### Method 2: Request from Administrator

Contact your VPN administrator and request:
- Your unique client name
- The `.ovpn` configuration file

#### Installing VPN Client

##### Windows

1. **Download OpenVPN Client**:
   - Go to https://openvpn.net/community-downloads/
   - Download "OpenVPN Connect" or "OpenVPN GUI"

2. **Install Certificate**:
   - Copy your `.ovpn` file to `C:\Program Files\OpenVPN\config\`
   - Or import through OpenVPN GUI

3. **Connect**:
   - Right-click OpenVPN GUI in system tray
   - Select your configuration
   - Click "Connect"

##### macOS

1. **Download Tunnelblick**:
   - Go to https://tunnelblick.net/
   - Download and install Tunnelblick

2. **Install Certificate**:
   - Double-click your `.ovpn` file
   - Tunnelblick will import it automatically

3. **Connect**:
   - Click Tunnelblick icon in menu bar
   - Select your configuration
   - Click "Connect"

##### iOS

1. **Download OpenVPN Connect**:
   - Install from App Store

2. **Import Certificate**:
   - Email the `.ovpn` file to yourself
   - Open the attachment in OpenVPN Connect
   - Or use iTunes file sharing

3. **Connect**:
   - Tap your profile in OpenVPN Connect
   - Tap the connection toggle

##### Android

1. **Download OpenVPN for Android**:
   - Install from Google Play Store

2. **Import Certificate**:
   - Copy `.ovpn` file to your device
   - Open OpenVPN app
   - Tap "+" and select "Import Profile from SD card"

3. **Connect**:
   - Tap your profile
   - Tap "Connect"

##### Linux

1. **Install OpenVPN**:
   ```bash
   # Ubuntu/Debian
   sudo apt install openvpn
   
   # CentOS/RHEL
   sudo yum install openvpn
   
   # Arch Linux
   sudo pacman -S openvpn
   ```

2. **Connect**:
   ```bash
   sudo openvpn --config your-config.ovpn
   ```

#### Troubleshooting Connection Issues

##### Common Problems

1. **Connection Timeout**:
   - Check if server IP and port are correct
   - Verify firewall allows UDP 1194
   - Try different network (mobile hotspot)

2. **Authentication Failed**:
   - Certificate may be expired or revoked
   - Contact administrator for new certificate

3. **DNS Issues**:
   - Try different DNS servers in VPN settings
   - Flush DNS cache on your device

4. **Slow Connection**:
   - Try different VPN server locations
   - Check your internet speed without VPN
   - Contact administrator about server load

##### Getting Help

1. **Check Connection Status**:
   - Look for connection logs in your VPN client
   - Note any error messages

2. **Test Basic Connectivity**:
   ```bash
   # Test server reachability
   ping your-server-ip
   
   # Test VPN port
   telnet your-server-ip 1194
   ```

3. **Contact Administrator**:
   - Provide your client name
   - Include error messages
   - Mention your device type and OS version

#### Security Best Practices

For comprehensive security guidelines, see [Security Documentation](docs/en/security/).

Key points:
- Keep certificates secure and don't share them
- Use strong device security (screen locks, updates, antivirus)
- Monitor your VPN connection and verify it's working
- Report lost devices immediately for certificate revocation

### Documentation

#### For Users
- **[User Guide](docs/en/installation/user-guide.md)** - Essential guide for family members
- **[Client Setup](docs/en/installation/client-setup.md)** - Set up VPN on your devices
- **[Руководство пользователя](docs/ru/installation/user-guide.md)** - Важное руководство для членов семьи
- **[Настройка клиентов](docs/ru/installation/client-setup.md)** - Настройка VPN на ваших устройствах

#### For Administrators
- **[Installation Guides](docs/en/installation/)** - Installation and setup documentation
- **[Deployment Guides](docs/en/deployment/)** - Platform-specific deployment guides
- **[Configuration Guides](docs/en/configuration/)** - Configuration and settings
- **[Security Documentation](docs/en/security/)** - Comprehensive security documentation
- **[API Documentation](docs/en/api/)** - API reference and examples
- **[Troubleshooting Guides](docs/en/troubleshooting/)** - Problem resolution guides

#### Russian Documentation
- **[Руководства по установке](docs/ru/installation/)** - Документация по установке и настройке
- **[Руководства по развертыванию](docs/ru/deployment/)** - Руководства по развертыванию для конкретных платформ
- **[Руководства по конфигурации](docs/ru/configuration/)** - Конфигурация и настройки
- **[Документация по безопасности](docs/ru/security/)** - Полная документация по безопасности
- **[API Документация](docs/ru/api/)** - API справочник и примеры
- **[Руководства по устранению неполадок](docs/ru/troubleshooting/)** - Руководства по решению проблем

### Support

For issues and support:

1. **Check Logs**: Located in `logs/` directory
2. **Run Diagnostics**: `npm test`
3. **Check System Status**: `npm run firewall:status`
4. **Review Documentation**: See links above

---

## Русский

### Обзор

Безопасный приватный OpenVPN сервер, разработанный для семейного использования с функциями безопасности корпоративного уровня. Это решение предоставляет полную VPN инфраструктуру с автоматизированным управлением сертификатами, веб-администрированием и комплексным усилением безопасности.

### Ключевые функции

- **🔐 Безопасная аутентификация**: JWT-аутентификация с bcrypt хешированием паролей
- **📜 Управление сертификатами**: Автоматизированная PKI с интеграцией Easy-RSA
- **🛡️ Усиление безопасности**: Правила firewall, ограничение скорости и предотвращение вторжений
- **🌐 Веб-интерфейс**: Простой веб-портал для загрузки сертификатов и управления
- **🐳 Поддержка Docker**: Контейнеризованное развертывание с правильными сетевыми привилегиями
- **📊 Мониторинг**: Комплексное логирование и отслеживание событий безопасности
- **🔄 Система резервного копирования**: Автоматизированное резервное копирование сертификатов и конфигураций

## 🚀 Быстрые ссылки

- **[📖 Первоначальная настройка](FIRST_TIME_RU.md)** - Полное руководство по настройке для начинающих
- **[📚 Документация](docs/ru/)** - Полная документация
- **[🔧 API Справочник](docs/ru/api/)** - Документация по API и примеры
- **[🛡️ Руководство по безопасности](docs/ru/security/)** - Документация по безопасности и лучшие практики
- **[🚀 Руководства по развертыванию](docs/ru/deployment/)** - Инструкции по развертыванию для конкретных платформ
- **[❓ Устранение неполадок](docs/ru/troubleshooting/)** - Руководства по решению проблем

### Быстрый старт

#### Требования
- Node.js 12.0.0+
- OpenVPN (системная установка)
- macOS, Linux, Windows или Docker
- Права root/Администратора для настройки сети

#### Установка и настройка

```bash
# 1. Клонирование и установка зависимостей
git clone <repository-url>
cd family-vpn-server
npm install

# 2. Первоначальная настройка
npm run setup          # Интерактивный мастер настройки
npm run setup-auth     # Создание учетных данных администратора
npm run init-pki       # Инициализация PKI инфраструктуры

# 3. Усиление безопасности
npm run harden-config  # Применение конфигураций безопасности
npm run firewall:init  # Настройка правил firewall

# 4. Запуск сервера
npm start
```

#### Развертывание Docker

```bash
# Быстрое развертывание
npm run docker:build
npm run docker:up

# Просмотр логов
npm run docker:logs

# Остановка сервисов
npm run docker:down
```

### Для разработчиков

#### Структура проекта

```
family-vpn-server/
├── src/                    # Исходный код
│   ├── server.js          # Основное приложение
│   ├── config.js          # Управление конфигурацией
│   ├── middleware/        # Middleware Express
│   ├── services/          # Сервисы бизнес-логики
│   └── utils/             # Утилитарные модули
├── scripts/               # Скрипты автоматизации
│   ├── setup.js          # Мастер настройки
│   ├── generate-client.js # Генерация сертификатов
│   └── security-scan.js   # Сканирование безопасности
├── test/                  # Тестовые наборы
├── easy-rsa/             # Управление PKI
├── logs/                 # Логи приложения
└── certificate-backups/  # Хранилище резервных копий
```

#### Команды разработки

```bash
# Сервер разработки с автоперезагрузкой
npm run dev

# Запуск всех тестов
npm test

# Отдельные тестовые наборы
npm run test:auth          # Тесты аутентификации
npm run test:security      # Тесты функций безопасности
npm run test:cert-manager  # Тесты управления сертификатами
npm run test:network-security  # Тесты сетевой безопасности

# Сканирование безопасности
npm run security-scan      # Полный аудит безопасности
npm run network-security   # Проверка сетевой конфигурации
```

#### Документация API

Полная документация API доступна в [docs/ru/api/](docs/ru/api/):
- [API аутентификации](docs/ru/api/authentication.md) - Вход, выход и управление токенами
- [API управления сертификатами](docs/ru/api/certificates.md) - Генерация и управление клиентскими сертификатами
- [Системный API](docs/ru/api/system.md) - Проверки работоспособности и мониторинг системы
- [Примеры API](docs/ru/api/examples.md) - Примеры кода на разных языках

#### Конфигурация

Переменные окружения в `.env`:

```env
# Конфигурация сервера
VPN_HOST=your-server-ip
VPN_PORT=1194
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0
API_PORT=3000

# Аутентификация
VPN_USERNAME=admin
VPN_PASSWORD_HASH=bcrypt_hash_here
JWT_SECRET=secure_random_secret
JWT_REFRESH_SECRET=secure_refresh_secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Настройки безопасности
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=900000
ENFORCE_IP_VALIDATION=false

# Пути
VPN_CONFIG_DIR=/etc/openvpn
VPN_CERT_DIR=/etc/openvpn/certificates
```

#### Варианты развертывания

##### Локальная установка

```bash
# Системная установка (требует root)
sudo npm run setup
sudo npm start

# Пользовательская установка
VPN_CONFIG_DIR=~/.privatevpn/config npm run setup
VPN_CONFIG_DIR=~/.privatevpn/config npm start
```

##### Развертывание Docker

```bash
# Сборка пользовательского образа
docker build -t family-vpn-server .

# Запуск с docker-compose
docker-compose up -d

# Ручной запуск docker
docker run -d \
  --name family-vpn-server \
  --cap-add=NET_ADMIN \
  --device /dev/net/tun \
  -p 1194:1194/udp \
  -p 3000:3000 \
  -v $(pwd)/certificates:/app/certificates \
  family-vpn-server
```

##### Облачное развертывание

Для подробных руководств по облачному развертыванию см. [docs/ru/deployment/](docs/ru/deployment/):
- [Развертывание AWS](docs/ru/deployment/aws.md) - Amazon Web Services
- [Развертывание Google Cloud](docs/ru/deployment/gcp.md) - Google Cloud Platform
- [Развертывание Azure](docs/ru/deployment/azure.md) - Microsoft Azure
- [Развертывание DigitalOcean](docs/ru/deployment/digitalocean.md) - DigitalOcean
- [Лучшие практики для продакшена](docs/ru/deployment/production.md) - Безопасность и мониторинг

### Для пользователей

#### Получение VPN сертификата

##### Способ 1: Веб-интерфейс

1. **Доступ к порталу управления**:
   - Откройте браузер и перейдите на `https://your-server-ip:3000`
   - Войдите с учетными данными администратора, предоставленными вашим администратором

2. **Генерация сертификата**:
   - Нажмите "Создать новый сертификат"
   - Введите уникальное имя клиента (например, "john-laptop", "mary-phone")
   - Нажмите "Создать"

3. **Загрузка конфигурации**:
   - Загрузите файл `.ovpn`
   - Сохраните его на своем устройстве

##### Способ 2: Запрос у администратора

Обратитесь к администратору VPN и запросите:
- Ваше уникальное имя клиента
- Файл конфигурации `.ovpn`

#### Установка VPN клиента

##### Windows

1. **Загрузка клиента OpenVPN**:
   - Перейдите на https://openvpn.net/community-downloads/
   - Загрузите "OpenVPN Connect" или "OpenVPN GUI"

2. **Установка сертификата**:
   - Скопируйте файл `.ovpn` в `C:\Program Files\OpenVPN\config\`
   - Или импортируйте через OpenVPN GUI

3. **Подключение**:
   - Щелкните правой кнопкой мыши на OpenVPN GUI в системном трее
   - Выберите вашу конфигурацию
   - Нажмите "Подключиться"

##### macOS

1. **Загрузка Tunnelblick**:
   - Перейдите на https://tunnelblick.net/
   - Загрузите и установите Tunnelblick

2. **Установка сертификата**:
   - Дважды щелкните на файле `.ovpn`
   - Tunnelblick импортирует его автоматически

3. **Подключение**:
   - Нажмите на иконку Tunnelblick в строке меню
   - Выберите вашу конфигурацию
   - Нажмите "Подключиться"

##### iOS

1. **Загрузка OpenVPN Connect**:
   - Установите из App Store

2. **Импорт сертификата**:
   - Отправьте файл `.ovpn` себе по электронной почте
   - Откройте вложение в OpenVPN Connect
   - Или используйте общий доступ к файлам iTunes

3. **Подключение**:
   - Нажмите на ваш профиль в OpenVPN Connect
   - Нажмите переключатель подключения

##### Android

1. **Загрузка OpenVPN для Android**:
   - Установите из Google Play Store

2. **Импорт сертификата**:
   - Скопируйте файл `.ovpn` на ваше устройство
   - Откройте приложение OpenVPN
   - Нажмите "+" и выберите "Импортировать профиль с SD карты"

3. **Подключение**:
   - Нажмите на ваш профиль
   - Нажмите "Подключиться"

##### Linux

1. **Установка OpenVPN**:
   ```bash
   # Ubuntu/Debian
   sudo apt install openvpn
   
   # CentOS/RHEL
   sudo yum install openvpn
   
   # Arch Linux
   sudo pacman -S openvpn
   ```

2. **Подключение**:
   ```bash
   sudo openvpn --config your-config.ovpn
   ```

#### Устранение проблем с подключением

##### Частые проблемы

1. **Таймаут подключения**:
   - Проверьте правильность IP сервера и порта
   - Убедитесь, что firewall разрешает UDP 1194
   - Попробуйте другую сеть (мобильную точку доступа)

2. **Ошибка аутентификации**:
   - Сертификат может быть просрочен или отозван
   - Обратитесь к администратору за новым сертификатом

3. **Проблемы с DNS**:
   - Попробуйте другие DNS серверы в настройках VPN
   - Очистите кеш DNS на вашем устройстве

4. **Медленное соединение**:
   - Попробуйте другие локации VPN сервера
   - Проверьте скорость интернета без VPN
   - Обратитесь к администратору по поводу нагрузки на сервер

##### Получение помощи

1. **Проверка статуса подключения**:
   - Посмотрите логи подключения в вашем VPN клиенте
   - Запишите любые сообщения об ошибках

2. **Тест базовой связности**:
   ```bash
   # Тест доступности сервера
   ping your-server-ip
   
   # Тест VPN порта
   telnet your-server-ip 1194
   ```

3. **Обращение к администратору**:
   - Предоставьте имя вашего клиента
   - Включите сообщения об ошибках
   - Укажите тип устройства и версию ОС

#### Лучшие практики безопасности

1. **Обеспечьте безопасность сертификатов**:
   - Не делитесь файлом `.ovpn`
   - Храните его в безопасном месте
   - Удалите из электронной почты после загрузки

2. **Используйте надежную безопасность устройства**:
   - Включите блокировку экрана устройства
   - Поддерживайте ОС и VPN клиент в актуальном состоянии
   - Используйте антивирусное программное обеспечение

3. **Мониторьте ваше подключение**:
   - Убедитесь, что VPN подключен перед просмотром
   - Проверьте ваш IP адрес: https://whatismyipaddress.com/
   - Отключайтесь, когда не нужно

### Документация

#### Для пользователей
- **[Руководство пользователя](docs/ru/installation/user-guide.md)** - Важное руководство для членов семьи
- **[Настройка клиентов](docs/ru/installation/client-setup.md)** - Настройка VPN на ваших устройствах
- **[User Guide](docs/en/installation/user-guide.md)** - Essential guide for family members
- **[Client Setup](docs/en/installation/client-setup.md)** - Set up VPN on your devices

#### Для администраторов
- **[Руководства по установке](docs/ru/installation/)** - Документация по установке и настройке
- **[Руководства по развертыванию](docs/ru/deployment/)** - Руководства по развертыванию для конкретных платформ
- **[Руководства по конфигурации](docs/ru/configuration/)** - Конфигурация и настройки
- **[Документация по безопасности](docs/ru/security/)** - Полная документация по безопасности
- **[API Документация](docs/ru/api/)** - API справочник и примеры
- **[Руководства по устранению неполадок](docs/ru/troubleshooting/)** - Руководства по решению проблем

#### English Documentation
- **[Installation Guides](docs/en/installation/)** - Installation and setup documentation
- **[Deployment Guides](docs/en/deployment/)** - Platform-specific deployment guides
- **[Configuration Guides](docs/en/configuration/)** - Configuration and settings
- **[Security Documentation](docs/en/security/)** - Comprehensive security documentation
- **[API Documentation](docs/en/api/)** - API reference and examples
- **[Troubleshooting Guides](docs/en/troubleshooting/)** - Problem resolution guides

### Поддержка

По вопросам и поддержке:

1. **Проверьте логи**: Расположены в директории `logs/`
2. **Запустите диагностику**: `npm test`
3. **Проверьте статус системы**: `npm run firewall:status`
4. **Просмотрите документацию**: См. ссылки выше

---

**Важно**: Для приватного использования. Соблюдайте местные законы при использовании VPN.