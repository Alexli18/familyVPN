# Устранение проблем сертификатов

Это руководство помогает решить проблемы, связанные с сертификатами в Family VPN Server.

## Общие проблемы сертификатов

### Проблемы центра сертификации (CA)

#### Сертификат CA отсутствует или поврежден

**Симптомы:**
- Ошибки "CA certificate not found"
- Невозможно генерировать клиентские сертификаты
- Ошибки проверки сертификатов

**Решения:**

1. **Проверка сертификата CA**
   ```bash
   # Проверка существования сертификата CA
   ls -la easy-rsa/pki/ca.crt
   
   # Проверка действительности сертификата CA
   openssl x509 -in easy-rsa/pki/ca.crt -text -noout
   
   # Проверка сертификата CA
   openssl x509 -in easy-rsa/pki/ca.crt -verify -noout
   ```

2. **Регенерация CA при повреждении**
   ```bash
   # Резервное копирование существующего PKI
   cp -r easy-rsa/pki easy-rsa/pki.backup.$(date +%Y%m%d)
   
   # Инициализация нового PKI
   cd easy-rsa
   ./easyrsa init-pki
   
   # Генерация нового CA
   ./easyrsa build-ca nopass
   ```

### Проблемы серверных сертификатов

#### Серверный сертификат истек

**Симптомы:**
- VPN клиенты не могут подключиться
- Ошибки "Certificate has expired"
- Ошибки TLS handshake

**Решения:**

1. **Проверка истечения серверного сертификата**
   ```bash
   # Проверка даты истечения
   openssl x509 -in certificates/server.crt -enddate -noout
   
   # Проверка всех сертификатов
   for cert in certificates/*.crt; do
     echo "Сертификат: $cert"
     openssl x509 -in "$cert" -enddate -noout
   done
   ```

2. **Обновление серверного сертификата**
   ```bash
   # Отзыв старого сертификата
   cd easy-rsa
   ./easyrsa revoke server
   
   # Генерация нового серверного сертификата
   ./easyrsa build-server-full server nopass
   
   # Обновление CRL
   ./easyrsa gen-crl
   
   # Копирование новых сертификатов
   cp pki/issued/server.crt ../certificates/
   cp pki/private/server.key ../certificates/
   cp pki/crl.pem ../certificates/
   ```

### Проблемы клиентских сертификатов

#### Ошибки генерации клиентских сертификатов

**Симптомы:**
- Ошибки "Failed to generate client certificate"
- Пустые или поврежденные файлы .ovpn
- Скрипты генерации сертификатов завершаются с ошибкой

**Решения:**

1. **Проверка конфигурации Easy-RSA**
   ```bash
   # Проверка правильной конфигурации Easy-RSA
   cd easy-rsa
   ls -la pki/
   
   # Проверка файла vars
   cat vars 2>/dev/null || echo "Файл vars не найден"
   
   # Тест функциональности Easy-RSA
   ./easyrsa show-ca
   ```

2. **Генерация клиентского сертификата вручную**
   ```bash
   # Переход в директорию Easy-RSA
   cd easy-rsa
   
   # Генерация клиентского сертификата
   ./easyrsa build-client-full client-name nopass
   
   # Проверка создания сертификата
   ls -la pki/issued/client-name.crt
   ls -la pki/private/client-name.key
   ```

## Мониторинг сертификатов

### Мониторинг истечения сертификатов

**Симптомы:**
- Сертификаты истекают без уведомления
- Прерывания сервиса из-за истекших сертификатов

**Решения:**

1. **Настройка мониторинга истечения**
   ```bash
   # Создание скрипта мониторинга
   cat > scripts/check-cert-expiration.sh << 'EOF'
   #!/bin/bash
   WARN_DAYS=30
   CRITICAL_DAYS=7
   
   check_cert() {
     local cert_file="$1"
     local cert_name="$2"
     
     if [ ! -f "$cert_file" ]; then
       echo "❌ Сертификат не найден: $cert_file"
       return 1
     fi
     
     local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
     local expiry_epoch=$(date -d "$expiry_date" +%s)
     local current_epoch=$(date +%s)
     local days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
     
     if [ $days_left -lt $CRITICAL_DAYS ]; then
       echo "🚨 КРИТИЧНО: $cert_name истекает через $days_left дней"
     elif [ $days_left -lt $WARN_DAYS ]; then
       echo "⚠️  ПРЕДУПРЕЖДЕНИЕ: $cert_name истекает через $days_left дней"
     else
       echo "✅ OK: $cert_name истекает через $days_left дней"
     fi
   }
   
   # Проверка всех сертификатов
   check_cert "easy-rsa/pki/ca.crt" "Центр сертификации"
   check_cert "certificates/server.crt" "Серверный сертификат"
   EOF
   
   chmod +x scripts/check-cert-expiration.sh
   ```

## Диагностические команды

### Проверка статуса сертификатов

```bash
# Проверка всех файлов сертификатов
ls -la certificates/
ls -la easy-rsa/pki/issued/
ls -la easy-rsa/pki/private/

# Проверка цепочки сертификатов
openssl verify -CAfile certificates/ca.crt certificates/server.crt

# Проверка деталей сертификата
openssl x509 -in certificates/server.crt -text -noout

# Тест загрузки сертификата
sudo openvpn --config /etc/openvpn/openvpn.conf --test-crypto
```

## Связанная документация

- [Конфигурация сертификатов](../configuration/certificates.md) - Настройка сертификатов
- [Проблемы аутентификации](authentication.md) - Устранение проблем аутентификации
- [Общие проблемы](common-issues.md) - Общее устранение неполадок
- [Процедуры восстановления](recovery.md) - Экстренные процедуры

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

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```
