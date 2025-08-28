# API аутентификации

📍 **Навигация**: [Главная](../../../README.md) > [Документация](../../README.md) > [Русский](../README.md) > [API](README.md) > Аутентификация

🌐 **Язык**: [English](../../en/api/authentication.md) | [Русский](../../ru/api/authentication.md) ← Вы здесь

## 📚 Навигация по разделу

- [🏠 Обзор API](README.md)
- [🔐 Аутентификация](authentication.md) ← Вы здесь
- [📜 Сертификаты](certificates.md)
- [🖥️ Система](system.md)
- [📋 Примеры](examples.md)

Этот документ описывает эндпоинты аутентификации для API семейного VPN сервера.

## Обзор

API использует аутентификацию на основе JWT (JSON Web Token). Большинство эндпоинтов требуют действительный токен доступа.

### Поток аутентификации

1. **Вход** для получения токенов доступа и обновления
2. **Использование токена доступа** в заголовке Authorization для вызовов API
3. **Обновление токена** когда токен доступа истекает
4. **Выход** для аннулирования токенов

## Эндпоинты

### POST /auth/login

Аутентификация пользователя и получение JWT токенов.

**Запрос:**
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "ваш_пароль"
}
```

**Ответ (Успех):**
```http
HTTP/1.1 200 OK
Set-Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure
Set-Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure

{
  "success": true,
  "message": "Аутентификация успешна",
  "expiresIn": "15m"
}
```

**Ответ (Ошибка):**
```http
HTTP/1.1 401 Unauthorized

{
  "success": false,
  "error": "Неверные учетные данные"
}
```

**Ограничение скорости:**
- Максимум 5 попыток за 15 минут на IP адрес
- Блокировка аккаунта после 5 неудачных попыток

### POST /auth/refresh

Обновление токена доступа с использованием токена обновления.

**Запрос:**
```http
POST /auth/refresh
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ (Успех):**
```http
HTTP/1.1 200 OK
Set-Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure

{
  "success": true,
  "message": "Токен успешно обновлен",
  "expiresIn": "15m"
}
```

**Ответ (Ошибка):**
```http
HTTP/1.1 401 Unauthorized

{
  "success": false,
  "error": "Недействительный токен обновления"
}
```

### POST /auth/logout

Выход пользователя и очистка токенов.

**Запрос:**
```http
POST /auth/logout
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ:**
```http
HTTP/1.1 200 OK
Set-Cookie: accessToken=; HttpOnly; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT
Set-Cookie: refreshToken=; HttpOnly; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT

{
  "success": true,
  "message": "Выход выполнен успешно"
}
```

## Соображения безопасности

- Все эндпоинты аутентификации используют только HTTPS
- Токены хранятся в HttpOnly, Secure cookies
- Ограничение скорости предотвращает атаки перебора
- Неудачные попытки входа регистрируются для мониторинга безопасности

## 🔗 Связанная документация

- [📜 API управления сертификатами](certificates.md) - Управление VPN сертификатами
- [🖥️ API системы](system.md) - Статус системы и мониторинг
- [📋 Примеры API](examples.md) - Практические примеры использования
- [⚙️ Конфигурация безопасности](../configuration/security.md) - Настройка аутентификации

## ⚡ Быстрые ссылки

- [🏠 Главная](../../../README.md)
- [📚 Документация](../../README.md)

---
**Предыдущая**: [API Overview](README.md) | **Следующая**: [Certificates API](certificates.md) | **Вверх**: [API Documentation](README.md)