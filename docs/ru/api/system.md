# Системный API

📍 **Навигация**: [Главная](../../../README.md) > [Документация](../../README.md) > [Русский](../README.md) > [API](README.md) > Система

🌐 **Язык**: [English](../../en/api/system.md) | [Русский](../../ru/api/system.md) ← Вы здесь

## 📚 Навигация по разделу

- [🏠 Обзор API](README.md)
- [🔐 Аутентификация](authentication.md)
- [📜 Сертификаты](certificates.md)
- [🖥️ Система](system.md) ← Вы здесь
- [📋 Примеры](examples.md)

Этот документ описывает эндпоинты мониторинга системы и статуса для API семейного VPN сервера.

## Обзор

Системный API предоставляет эндпоинты для проверки работоспособности, мониторинга статуса системы и доступа к логам. Эндпоинт работоспособности публичный, в то время как статус и логи требуют аутентификации.

## Эндпоинты

### GET /health

Эндпоинт проверки работоспособности (аутентификация не требуется).

**Запрос:**
```http
GET /health
```

**Ответ:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### GET /api/status

Получение статуса системы и статистики.

**Аутентификация:** Требуется

**Запрос:**
```http
GET /api/status
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "status": {
    "server": {
      "status": "running",
      "uptime": 3600,
      "version": "1.0.0",
      "nodeVersion": "18.17.0"
    },
    "openvpn": {
      "status": "running",
      "connectedClients": 3,
      "totalConnections": 15,
      "bytesReceived": 1048576,
      "bytesSent": 2097152
    },
    "certificates": {
      "total": 5,
      "active": 4,
      "revoked": 1,
      "expiringSoon": 0
    },
    "system": {
      "cpuUsage": 15.2,
      "memoryUsage": 45.8,
      "diskUsage": 23.1
    }
  }
}
```

### GET /api/logs

Получение последних записей логов.

**Аутентификация:** Требуется

**Параметры запроса:**
- `level`: Фильтр по уровню лога (error, warn, info, debug)
- `limit`: Количество записей для возврата (по умолчанию: 100, максимум: 1000)
- `since`: ISO временная метка для получения логов с определенного времени

**Запрос:**
```http
GET /api/logs?level=error&limit=50&since=2025-01-15T00:00:00Z
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "level": "error",
      "message": "Неудачная аутентификация",
      "clientIP": "192.168.1.100",
      "username": "admin",
      "correlationId": "abc123"
    }
  ]
}
```

## Информация о статусе

### Статус сервера
- **status**: Текущее состояние сервера (running, stopped, error)
- **uptime**: Время работы сервера в секундах
- **version**: Версия приложения
- **nodeVersion**: Версия среды выполнения Node.js

### Статус OpenVPN
- **status**: Состояние демона OpenVPN (running, stopped, error)
- **connectedClients**: Количество подключенных в данный момент клиентов
- **totalConnections**: Общее количество соединений с момента запуска сервера
- **bytesReceived**: Общее количество байт, полученных от клиентов
- **bytesSent**: Общее количество байт, отправленных клиентам

### Статистика сертификатов
- **total**: Общее количество выданных сертификатов
- **active**: Количество активных (не отозванных, не истекших) сертификатов
- **revoked**: Количество отозванных сертификатов
- **expiringSoon**: Количество сертификатов, истекающих в течение 30 дней

### Системные метрики
- **cpuUsage**: Текущее использование CPU в процентах
- **memoryUsage**: Текущее использование памяти в процентах
- **diskUsage**: Текущее использование диска в процентах

## Уровни логов

- **error**: Условия ошибок, требующие немедленного внимания
- **warn**: Предупреждающие условия, которые следует отслеживать
- **info**: Информационные сообщения о нормальных операциях
- **debug**: Подробная информация для отладки

## Ограничение скорости

Системные эндпоинты имеют следующие ограничения скорости:
- **Общий API**: 100 запросов в час на аутентифицированного пользователя
- **Эндпоинт работоспособности**: Без ограничений скорости (публичный эндпоинт)

## Обработка ошибок

Все системные эндпоинты возвращают согласованные ответы об ошибках:

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "success": false,
  "error": "Мониторинг системы недоступен",
  "details": {
    "component": "openvpn",
    "message": "Невозможно подключиться к интерфейсу управления OpenVPN"
  }
}
```

## Заголовки безопасности

Все API ответы включают заголовки безопасности:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Связанные документы

- [API аутентификации](authentication.md)
- [API управления сертификатами](certificates.md)
- [Примеры API](examples.md)