# API управления сертификатами

📍 **Навигация**: [Главная](../../../README.md) > [Документация](../../README.md) > [Русский](../README.md) > [API](README.md) > Сертификаты

🌐 **Язык**: [English](../../en/api/certificates.md) | [Русский](../../ru/api/certificates.md) ← Вы здесь

## 📚 Навигация по разделу

- [🏠 Обзор API](README.md)
- [🔐 Аутентификация](authentication.md)
- [📜 Сертификаты](certificates.md) ← Вы здесь
- [🖥️ Система](system.md)
- [📋 Примеры](examples.md)

Этот документ описывает эндпоинты управления сертификатами для API семейного VPN сервера.

## Обзор

API управления сертификатами позволяет создавать, просматривать, получать детали и отзывать клиентские сертификаты для доступа к VPN. Все эндпоинты требуют аутентификации.

## Эндпоинты

### POST /api/generate-cert

Создание нового клиентского сертификата и конфигурации.

**Аутентификация:** Требуется

**Запрос:**
```http
POST /api/generate-cert
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "clientName": "john-laptop",
  "email": "john@example.com" // опционально
}
```

**Ответ (Успех):**
```http
HTTP/1.1 200 OK
Content-Type: application/x-openvpn-profile
Content-Disposition: attachment; filename="john-laptop.ovpn"

client
dev tun
proto udp
remote ip-вашего-сервера 1194
resolv-retry infinite
nobind
persist-key
persist-tun
...
<ca>
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
</ca>
<cert>
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
</cert>
<key>
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
</key>
```

**Ответ (Ошибка):**
```http
HTTP/1.1 400 Bad Request

{
  "success": false,
  "error": "Имя клиента уже существует"
}
```

**Правила валидации:**
- `clientName`: Обязательно, 3-50 символов, только буквенно-цифровые символы и дефисы
- `email`: Опционально, действительный формат email

### GET /api/certificates

Список всех клиентских сертификатов.

**Аутентификация:** Требуется

**Запрос:**
```http
GET /api/certificates
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "certificates": [
    {
      "id": "1",
      "clientName": "john-laptop",
      "email": "john@example.com",
      "createdAt": "2025-01-15T10:30:00Z",
      "expiresAt": "2026-01-15T10:30:00Z",
      "status": "active",
      "serialNumber": "01"
    },
    {
      "id": "2",
      "clientName": "mary-phone",
      "email": "mary@example.com",
      "createdAt": "2025-01-16T14:20:00Z",
      "expiresAt": "2026-01-16T14:20:00Z",
      "status": "active",
      "serialNumber": "02"
    }
  ]
}
```

### GET /api/certificates/:id

Получение деталей конкретного сертификата.

**Аутентификация:** Требуется

**Запрос:**
```http
GET /api/certificates/1
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "certificate": {
    "id": "1",
    "clientName": "john-laptop",
    "email": "john@example.com",
    "createdAt": "2025-01-15T10:30:00Z",
    "expiresAt": "2026-01-15T10:30:00Z",
    "status": "active",
    "serialNumber": "01",
    "subject": "CN=john-laptop",
    "issuer": "CN=Family VPN CA",
    "fingerprint": "SHA256:1234567890abcdef..."
  }
}
```

### DELETE /api/certificates/:id

Отзыв клиентского сертификата.

**Аутентификация:** Требуется

**Запрос:**
```http
DELETE /api/certificates/1
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Сертификат успешно отозван"
}
```

## Жизненный цикл сертификата

1. **Генерация**: Создание нового сертификата с уникальным именем клиента
2. **Активный**: Сертификат действителен и может использоваться для VPN соединений
3. **Истекающий**: Сертификат приближается к дате истечения
4. **Отозванный**: Сертификат был вручную отозван и не может использоваться
5. **Истекший**: Сертификат прошел дату истечения

## Ограничение скорости

Генерация сертификатов ограничена по скорости для предотвращения злоупотреблений:
- **Генерация сертификатов**: 10 запросов в час на аутентифицированного пользователя

## Соображения безопасности

- Имена клиентов должны быть уникальными в системе
- Приватные ключи никогда не возвращаются в эндпоинтах списка или деталей
- Отозванные сертификаты немедленно добавляются в список отзыва сертификатов (CRL)
- Все операции с сертификатами регистрируются для целей аудита

## Связанные документы

- [API аутентификации](authentication.md)
- [Системный API](system.md)
- [Примеры API](examples.md)