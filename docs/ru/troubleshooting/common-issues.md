# Частые проблемы и решения

Это руководство охватывает наиболее часто встречающиеся проблемы и их решения.

## Проблемы аутентификации

### Ошибка: "Authentication failed" / "Invalid credentials"

**Симптомы:**
- Невозможно войти в веб-интерфейс
- Ошибка 401 при обращении к API
- Форма входа продолжает отклонять учетные данные

**Решения:**

```bash
# 1. Проверьте настройки аутентификации
cat .env | grep -E "(VPN_USERNAME|VPN_PASSWORD_HASH|JWT_SECRET)"

# 2. Пересоздайте учетные данные
npm run setup-auth

# 3. Проверьте логи безопасности
tail -f logs/security-$(date +%Y-%m-%d).log

# 4. Сбросьте блокировку аккаунта (если заблокирован)
rm -f /tmp/vpn-auth-lockout-*
```

### Ошибка: "Account locked"

**Симптомы:**
- Сообщение о временной блокировке аккаунта
- Невозможность входа даже с правильными учетными данными
- Множественные неудачные попытки входа

**Решения:**

```bash
# 1. Подождите окончания периода блокировки (15 минут по умолчанию)
# 2. Или сбросьте блокировку вручную
rm -f /tmp/vpn-auth-lockout-*

# 3. Проверьте настройки блокировки в .env
echo "MAX_FAILED_ATTEMPTS=5" >> .env
echo "LOCKOUT_DURATION=900000" >> .env
```

## Проблемы с сертификатами

### Ошибка: "Certificate generation failed"

**Симптомы:**
- Невозможно создать клиентские сертификаты
- Ошибки при выполнении `npm run generate-client`
- Сбои инициализации PKI

**Решения:**

```bash
# 1. Проверьте состояние PKI
ls -la easy-rsa/pki/

# 2. Переинициализируйте PKI при необходимости
npm run clean
npm run init-pki

# 3. Проверьте права доступа к файлам
chmod -R 755 easy-rsa/
chmod 600 easy-rsa/pki/private/*

# 4. Убедитесь, что CA сертификат существует
ls -la easy-rsa/pki/ca.crt
```

### Ошибка: "Server certificate invalid"

**Симптомы:**
- OpenVPN сервер не запускается
- Ошибки валидации серверного сертификата
- Сбои SSL/TLS рукопожатия

**Решения:**

```bash
# 1. Обновите серверный сертификат
npm run fix-server-cert

# 2. Проверьте срок действия сертификата
openssl x509 -in easy-rsa/pki/issued/server.crt -text -noout | grep -A2 "Validity"

# 3. Убедитесь, что ключ и сертификат соответствуют
openssl x509 -noout -modulus -in easy-rsa/pki/issued/server.crt | openssl md5
openssl rsa -noout -modulus -in easy-rsa/pki/private/server.key | openssl md5
```

## Сетевые проблемы

### Ошибка: "Connection refused" на порту 3000

**Симптомы:**
- Веб-интерфейс недоступен
- Ошибка подключения к http://localhost:3000
- Невозможно получить доступ к интерфейсу управления

**Решения:**

```bash
# 1. Проверьте, запущен ли сервер
ps aux | grep node
netstat -tlnp | grep 3000

# 2. Запустите сервер
npm start

# 3. Проверьте логи запуска
tail -f logs/application-$(date +%Y-%m-%d).log

# 4. Проверьте правила брандмауэра
npm run firewall:status
```

### Ошибка: "VPN connection failed"

**Симптомы:**
- Клиент не может подключиться к VPN
- Таймауты подключения
- Сбои аутентификации от клиента

**Решения:**

```bash
# 1. Проверьте статус OpenVPN сервера
sudo systemctl status openvpn@server
# или
ps aux | grep openvpn

# 2. Проверьте сетевые настройки
ip addr show tun0
ip route | grep tun0

# 3. Проверьте правила брандмауэра
npm run firewall:status

# 4. Протестируйте разрешение DNS
npm run dns:test

# 5. Проверьте логи OpenVPN
sudo tail -f /var/log/openvpn/server.log
```

## Проблемы сервисов

### Ошибка: "Port already in use"

**Симптомы:**
- Сервер не может запуститься
- Сообщения об ошибке "EADDRINUSE"
- Сбои привязки портов

**Решения:**

```bash
# 1. Найдите процесс, использующий порт
lsof -i :3000
lsof -i :1194

# 2. Завершите конфликтующие процессы
pkill -f "node.*server.js"
sudo pkill -f openvpn

# 3. Подождите и перезапустите
sleep 5
npm start
```

### Ошибка: "Permission denied"

**Симптомы:**
- Невозможно получить доступ к файлам или каталогам
- Сбои операций с сертификатами
- Сбои запуска сервиса

**Решения:**

```bash
# 1. Проверьте права доступа к файлам
ls -la easy-rsa/pki/
ls -la certificates/

# 2. Исправьте права доступа
chmod -R 755 easy-rsa/
chmod 600 easy-rsa/pki/private/*
chmod 755 certificates/

# 3. Проверьте владельца пользователя
chown -R $USER:$USER easy-rsa/
chown -R $USER:$USER certificates/
```

## Проблемы конфигурации

### Ошибка: "Missing environment variables"

**Симптомы:**
- Сервер не может запуститься
- Ошибки валидации конфигурации
- Отсутствует файл .env

**Решения:**

```bash
# 1. Проверьте, существует ли файл .env
ls -la .env

# 2. Пересоздайте файл .env
npm run setup

# 3. Проверьте необходимые переменные
cat .env | grep -E "(VPN_HOST|VPN_SUBNET|JWT_SECRET)"

# 4. Установите отсутствующие переменные вручную
echo "VPN_HOST=your-server-ip" >> .env
echo "VPN_SUBNET=10.8.0.0" >> .env
echo "VPN_NETMASK=255.255.255.0" >> .env
```

### Ошибка: "Invalid configuration"

**Симптомы:**
- OpenVPN сервер не запускается
- Ошибки парсинга конфигурации
- Сбои настройки сети

**Решения:**

```bash
# 1. Проверьте конфигурацию OpenVPN
openvpn --config certificates/openvpn.conf --test-crypto

# 2. Проверьте синтаксис конфигурации
npm run validate-config

# 3. Перегенерируйте конфигурацию
npm run harden-config

# 4. Проверьте сетевые настройки
ip route
iptables -L -n
```

## Быстрые исправления

### Сброс всего

```bash
# Полный сброс (используйте с осторожностью)
npm run clean
rm -f .env
npm install
npm run setup
npm run setup-auth
npm run init-pki
npm run harden-config
```

### Перезапуск сервисов

```bash
# Перезапуск Node.js сервера
pkill -f "node.*server.js"
npm start

# Перезапуск OpenVPN (системный сервис)
sudo systemctl restart openvpn@server

# Перезапуск Docker контейнеров
npm run docker:down
npm run docker:up
```

### Проверка состояния системы

```bash
# Запуск всех тестов
npm test

# Проверка логов на ошибки
grep -i error logs/*.log

# Проверка системных ресурсов
free -h
df -h
top
```

## Советы по предотвращению

1. **Регулярные резервные копии**: Выполняйте `npm run backup:create` еженедельно
2. **Мониторинг логов**: Проверяйте логи ежедневно на необычную активность
3. **Обновление сертификатов**: Отслеживайте даты истечения сертификатов
4. **Обновления системы**: Поддерживайте систему и зависимости в актуальном состоянии
5. **Сканирование безопасности**: Регулярно выполняйте `npm run security-scan`

## Когда обращаться за помощью

Обращайтесь в поддержку, когда:
- Подозреваются нарушения безопасности
- Происходит повреждение данных
- Затронуты несколько систем
- Процедуры восстановления не работают

Всегда включайте диагностическую информацию при сообщении о проблемах (см. [diagnostics.md](diagnostics.md)).

<!-- auto-added placeholders to match EN structure -->

## Дополнительный раздел (заглушка 1)


## Дополнительный раздел (заглушка 2)


## Дополнительный раздел (заглушка 3)
