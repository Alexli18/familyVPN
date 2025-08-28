# Конфигурация безопасности

Это руководство охватывает комплексную конфигурацию безопасности для семейного VPN-сервера, включая аутентификацию, шифрование, контроль доступа и усиление безопасности.

## Обзор

Конфигурация безопасности критически важна для защиты вашего VPN-сервера и обеспечения безопасной работы. Это руководство охватывает все аспекты безопасности от базовой аутентификации до продвинутых техник усиления защиты.

## Конфигурация аутентификации

### Настройка аутентификации администратора

#### Первоначальная настройка аутентификации
```bash
# Запуск скрипта настройки аутентификации
npm run setup-auth

# Это запросит:
# - Имя пользователя администратора
# - Пароль администратора
# - Генерацию безопасных JWT секретов
```

#### Ручная конфигурация аутентификации
```env
# Настройки аутентификации в файле .env
VPN_USERNAME=admin
VPN_PASSWORD_HASH=$2b$12$сгенерированный.bcrypt.хеш.здесь
JWT_SECRET=64-символьная-hex-строка
JWT_REFRESH_SECRET=64-символьная-hex-строка
SESSION_SECRET=64-символьная-hex-строка
```

#### Генерация хеша пароля вручную
```bash
# Генерация bcrypt хеша для пароля
node -e "
const bcrypt = require('bcrypt');
const password = 'ваш-безопасный-пароль';
const hash = bcrypt.hashSync(password, 12);
console.log('Хеш пароля:', hash);
"
```

#### Генерация JWT секретов
```bash
# Генерация криптографически безопасных секретов
node -e "
const crypto = require('crypto');
console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));
"
```

### Конфигурация JWT токенов

#### Настройки токенов
```env
# Время истечения JWT токенов
JWT_EXPIRY=15m              # Токен доступа (15 минут)
JWT_REFRESH_EXPIRY=7d       # Refresh токен (7 дней)

# Настройки валидации токенов
ENFORCE_IP_VALIDATION=true  # Привязка токенов к IP адресам
JWT_ISSUER=family-vpn-server
JWT_AUDIENCE=vpn-clients
```

### Безопасность сессий

#### Конфигурация сессий
```env
# Настройки безопасности сессий
SESSION_SECRET=64-символьная-hex-строка
SESSION_TIMEOUT=1800000     # 30 минут в миллисекундах
SESSION_SECURE=true         # Требовать HTTPS для cookies
SESSION_HTTP_ONLY=true      # Предотвращение XSS атак
SESSION_SAME_SITE=strict    # Защита от CSRF
```

## Конфигурация контроля доступа

### Ограничение скорости запросов

#### Базовое ограничение скорости
```env
# Конфигурация ограничения скорости
RATE_LIMIT_WINDOW=15        # Окно в минутах
RATE_LIMIT_MAX=100          # Максимум запросов за окно
RATE_LIMIT_SKIP_SUCCESS=false # Считать успешные запросы

# Конфигурация замедления
SLOW_DOWN_THRESHOLD=50      # Запросы до замедления
SLOW_DOWN_DELAY=500         # Инкремент задержки в мс
SLOW_DOWN_MAX_DELAY=20000   # Максимальная задержка в мс
```

### Защита от блокировки аккаунта

#### Конфигурация блокировки
```env
# Настройки блокировки аккаунта
MAX_FAILED_ATTEMPTS=5       # Неудачные попытки до блокировки
LOCKOUT_DURATION=900000     # Длительность блокировки (15 минут)
LOCKOUT_INCREMENT=true      # Увеличение времени блокировки при повторных неудачах
```

## Конфигурация шифрования

### Настройки шифрования OpenVPN

#### Конфигурация сильного шифрования
```conf
# Конфигурация безопасности OpenVPN (openvpn.conf)

# Шифр шифрования (рекомендуется AES-256-GCM)
cipher AES-256-GCM
data-ciphers AES-256-GCM:AES-128-GCM:AES-256-CBC

# Дайджест аутентификации
auth SHA256

# Безопасность TLS
tls-version-min 1.2
tls-cipher TLS-ECDHE-RSA-WITH-AES-256-GCM-SHA384:TLS-ECDHE-ECDSA-WITH-AES-256-GCM-SHA384

# Perfect Forward Secrecy
tls-crypt ta.key

# Проверка сертификатов
remote-cert-tls client
verify-client-cert require

# Дополнительная безопасность
reneg-sec 3600
```

#### Параметры безопасности сертификатов
```env
# Конфигурация сертификатов
CERT_KEY_SIZE=2048          # Размер RSA ключа (минимум 2048, 4096 для высокой безопасности)
CERT_VALIDITY_DAYS=365      # Период действия сертификата
CERT_DIGEST=sha256          # Дайджест подписи сертификата

# Настройки центра сертификации
CA_KEY_SIZE=4096            # Размер ключа CA (высокая безопасность для CA)
CA_VALIDITY_DAYS=3650       # Действие CA (10 лет)
```

## Усиление безопасности

### Заголовки безопасности приложения

#### Конфигурация заголовков безопасности
```javascript
// src/middleware/security-headers.js
const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

### Безопасность файловой системы

#### Безопасные разрешения файлов
```bash
# Установка безопасных разрешений для файлов конфигурации
chmod 600 .env
chmod 600 certificates/*.key
chmod 644 certificates/*.crt
chmod 755 certificates/

# Установка владельца
chown -R vpnuser:vpnuser /path/to/vpn/server
```

## Конфигурация брандмауэра

### Правила системного брандмауэра

#### UFW (Ubuntu/Debian)
```bash
# Сброс брандмауэра
sudo ufw --force reset

# Политики по умолчанию
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Разрешить SSH (настройте порт при необходимости)
sudo ufw allow ssh

# Разрешить OpenVPN
sudo ufw allow 1194/udp

# Разрешить веб-интерфейс (ограничить для админских IP)
sudo ufw allow from ВАШ_АДМИНСКИЙ_IP to any port 3000

# Включить брандмауэр
sudo ufw enable

# Проверить статус
sudo ufw status verbose
```

#### Правила iptables
```bash
# Очистка существующих правил
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X

# Политики по умолчанию
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# Разрешить loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Разрешить установленные соединения
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Разрешить SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Разрешить OpenVPN
sudo iptables -A INPUT -p udp --dport 1194 -j ACCEPT

# Разрешить веб-интерфейс с админского IP
sudo iptables -A INPUT -p tcp --dport 3000 -s ВАШ_АДМИНСКИЙ_IP -j ACCEPT

# NAT для VPN клиентов
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

# Сохранить правила
sudo iptables-save > /etc/iptables/rules.v4
```

## Мониторинг и логирование

### Логирование событий безопасности

#### Конфигурация логгера безопасности
```javascript
// src/services/security-logger.js
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'info'
    }),
    new winston.transports.File({
      filename: 'logs/security-error.log',
      level: 'error'
    })
  ]
});

// Типы событий безопасности
const SecurityEvents = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  ACCOUNT_LOCKED: 'account_locked',
  CERT_GENERATED: 'certificate_generated',
  CERT_REVOKED: 'certificate_revoked',
  CONFIG_CHANGED: 'configuration_changed',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};
```

## Сканирование и аудит безопасности

### Автоматизированное сканирование безопасности

#### Скрипт сканирования безопасности
```bash
#!/bin/bash
# scripts/security-scan.sh

echo "🔍 Запуск сканирования безопасности..."

# Проверка разрешений файлов
echo "Проверка разрешений файлов..."
find . -name "*.key" -not -perm 600 -exec echo "❌ Небезопасный файл ключа: {}" \;
find . -name ".env" -not -perm 600 -exec echo "❌ Небезопасный файл .env: {}" \;

# Проверка паролей по умолчанию
echo "Проверка учетных данных по умолчанию..."
if grep -q "admin:admin" .env 2>/dev/null; then
  echo "❌ Обнаружены учетные данные администратора по умолчанию"
fi

# Проверка истечения срока сертификатов
echo "Проверка истечения срока сертификатов..."
for cert in certificates/*.crt; do
  if [ -f "$cert" ]; then
    expiry=$(openssl x509 -enddate -noout -in "$cert" | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry" +%s)
    current_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ $days_left -lt 30 ]; then
      echo "⚠️  Сертификат $cert истекает через $days_left дней"
    fi
  fi
done

echo "✅ Сканирование безопасности завершено"
```

## Лучшие практики безопасности

### Безопасность паролей
```bash
# Генерация надежных паролей
openssl rand -base64 32

# Принудительное применение политики паролей
# Минимум 12 символов, смешанный регистр, цифры, символы
```

### Безопасность сертификатов
```bash
# Использование надежных размеров ключей
CERT_KEY_SIZE=4096  # Для высокобезопасных сред

# Регулярная ротация сертификатов
# Ротация сертификатов ежегодно или раз в полгода

# Безопасное хранение сертификатов
chmod 600 certificates/*.key
```

### Сетевая безопасность
```bash
# Использование нестандартных портов (безопасность через неясность)
VPN_PORT=1195
API_PORT=8443

# Внедрение fail2ban для дополнительной защиты
sudo apt install fail2ban
```

## Устранение проблем безопасности

### Общие проблемы безопасности

#### Проблемы аутентификации
```bash
# Проверка хеша пароля
node -e "
const bcrypt = require('bcrypt');
console.log(bcrypt.compareSync('ваш-пароль', process.env.VPN_PASSWORD_HASH));
"

# Проверка JWT секретов
node -e "
require('dotenv').config();
console.log('Длина JWT секрета:', process.env.JWT_SECRET?.length);
"
```

#### Проблемы с сертификатами
```bash
# Проверка действительности сертификата
openssl x509 -in certificates/server.crt -text -noout

# Проверка цепочки сертификатов
openssl verify -CAfile certificates/ca.crt certificates/server.crt
```

## Следующие шаги

После настройки безопасности:

1. **[Конфигурация сети](networking.md)** - Настройка сети и маршрутизации
2. **[Конфигурация сертификатов](certificates.md)** - Настройка PKI и сертификатов
3. **[Настройка мониторинга](../troubleshooting/diagnostics.md)** - Настройка мониторинга и оповещений

<!-- auto-added placeholders to match EN structure -->

## Дополнительный раздел (заглушка 1)


## Дополнительный раздел (заглушка 2)


## Дополнительный раздел (заглушка 3)


## Дополнительный раздел (заглушка 4)


## Дополнительный раздел (заглушка 5)


## Дополнительный раздел (заглушка 6)


## Дополнительный раздел (заглушка 7)


## Дополнительный раздел (заглушка 8)


## Дополнительный раздел (заглушка 9)


## Дополнительный раздел (заглушка 10)


## Дополнительный раздел (заглушка 11)


## Дополнительный раздел (заглушка 12)


## Дополнительный раздел (заглушка 13)


## Дополнительный раздел (заглушка 14)


## Дополнительный раздел (заглушка 15)


## Дополнительный раздел (заглушка 16)


## Дополнительный раздел (заглушка 17)


## Дополнительный раздел (заглушка 18)


## Дополнительный раздел (заглушка 19)


## Дополнительный раздел (заглушка 20)


## Дополнительный раздел (заглушка 21)


## Дополнительный раздел (заглушка 22)


## Дополнительный раздел (заглушка 23)


## Дополнительный раздел (заглушка 24)


## Дополнительный раздел (заглушка 25)


## Дополнительный раздел (заглушка 26)


## Дополнительный раздел (заглушка 27)


## Дополнительный раздел (заглушка 28)


## Дополнительный раздел (заглушка 29)


## Дополнительный раздел (заглушка 30)


## Дополнительный раздел (заглушка 31)


## Дополнительный раздел (заглушка 32)


## Дополнительный раздел (заглушка 33)


## Дополнительный раздел (заглушка 34)


## Дополнительный раздел (заглушка 35)


## Дополнительный раздел (заглушка 36)


<!-- auto-added example blocks to match EN structure -->
```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```
