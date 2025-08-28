# Примеры использования API

Этот документ предоставляет практические примеры использования API семейного VPN сервера на разных языках программирования.

## Базовая конфигурация

Все примеры предполагают следующую базовую конфигурацию:

- **Базовый URL**: `https://адрес-вашего-сервера:3000`
- **Аутентификация**: JWT токены через HTTP-only cookies
- **Тип контента**: `application/json` для запросов
- **HTTPS**: Требуется для всех вызовов API

## Примеры JavaScript/Node.js

### Полный класс VPN клиента

```javascript
const axios = require('axios');

class VPNClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.accessToken = null;
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        username,
        password
      }, {
        withCredentials: true
      });
      
      console.log('Вход успешен');
      return response.data;
    } catch (error) {
      console.error('Вход не удался:', error.response.data);
      throw error;
    }
  }

  async generateCertificate(clientName, email) {
    try {
      const response = await axios.post(`${this.baseURL}/api/generate-cert`, {
        clientName,
        email
      }, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      return response.data; // содержимое .ovpn файла
    } catch (error) {
      console.error('Генерация сертификата не удалась:', error.response.data);
      throw error;
    }
  }

  async getCertificates() {
    try {
      const response = await axios.get(`${this.baseURL}/api/certificates`, {
        withCredentials: true
      });
      
      return response.data.certificates;
    } catch (error) {
      console.error('Не удалось получить сертификаты:', error.response.data);
      throw error;
    }
  }

  async getSystemStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/api/status`, {
        withCredentials: true
      });
      
      return response.data.status;
    } catch (error) {
      console.error('Не удалось получить статус системы:', error.response.data);
      throw error;
    }
  }

  async revokeCertificate(certificateId) {
    try {
      const response = await axios.delete(`${this.baseURL}/api/certificates/${certificateId}`, {
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Не удалось отозвать сертификат:', error.response.data);
      throw error;
    }
  }

  async logout() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/logout`, {}, {
        withCredentials: true
      });
      
      console.log('Выход успешен');
      return response.data;
    } catch (error) {
      console.error('Выход не удался:', error.response.data);
      throw error;
    }
  }
}

// Пример использования
async function main() {
  const client = new VPNClient('https://ваш-сервер:3000');

  try {
    // Вход
    await client.login('admin', 'пароль');
    
    // Получение текущих сертификатов
    const certificates = await client.getCertificates();
    console.log('Текущие сертификаты:', certificates);
    
    // Генерация нового сертификата
    const ovpnFile = await client.generateCertificate('новый-клиент', 'user@example.com');
    
    // Сохранение сертификата в файл
    const fs = require('fs');
    fs.writeFileSync('новый-клиент.ovpn', ovpnFile);
    console.log('Сертификат сохранен в новый-клиент.ovpn');
    
    // Получение статуса системы
    const status = await client.getSystemStatus();
    console.log('Статус системы:', status);
    
    // Выход
    await client.logout();
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

main();
```

### Пример браузерного JavaScript

```javascript
class VPNWebClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async login(username, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return await response.json();
  }

  async getCertificates() {
    const response = await fetch(`${this.baseURL}/api/certificates`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    return data.certificates;
  }

  async downloadCertificate(clientName, email) {
    const response = await fetch(`${this.baseURL}/api/generate-cert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ clientName, email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    // Создание ссылки для скачивания
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientName}.ovpn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
```

## Примеры Python

### Полный Python клиент

```python
import requests
import json
from typing import Optional, List, Dict

class VPNClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
    
    def login(self, username: str, password: str) -> Dict:
        """Вход и установка сессии"""
        response = self.session.post(f"{self.base_url}/auth/login", json={
            "username": username,
            "password": password
        })
        
        if response.status_code == 200:
            print("Вход успешен")
            return response.json()
        else:
            error_data = response.json()
            print(f"Вход не удался: {error_data}")
            response.raise_for_status()
    
    def generate_certificate(self, client_name: str, email: Optional[str] = None) -> bytes:
        """Генерация и возврат содержимого сертификата"""
        data = {"clientName": client_name}
        if email:
            data["email"] = email
            
        response = self.session.post(f"{self.base_url}/api/generate-cert", json=data)
        
        if response.status_code == 200:
            return response.content  # содержимое .ovpn файла
        else:
            error_data = response.json()
            print(f"Генерация сертификата не удалась: {error_data}")
            response.raise_for_status()
    
    def get_certificates(self) -> List[Dict]:
        """Получение списка всех сертификатов"""
        response = self.session.get(f"{self.base_url}/api/certificates")
        
        if response.status_code == 200:
            return response.json()["certificates"]
        else:
            error_data = response.json()
            print(f"Не удалось получить сертификаты: {error_data}")
            response.raise_for_status()
    
    def get_certificate_details(self, cert_id: str) -> Dict:
        """Получение подробной информации о конкретном сертификате"""
        response = self.session.get(f"{self.base_url}/api/certificates/{cert_id}")
        
        if response.status_code == 200:
            return response.json()["certificate"]
        else:
            error_data = response.json()
            print(f"Не удалось получить детали сертификата: {error_data}")
            response.raise_for_status()
    
    def revoke_certificate(self, cert_id: str) -> Dict:
        """Отзыв сертификата"""
        response = self.session.delete(f"{self.base_url}/api/certificates/{cert_id}")
        
        if response.status_code == 200:
            return response.json()
        else:
            error_data = response.json()
            print(f"Не удалось отозвать сертификат: {error_data}")
            response.raise_for_status()
    
    def get_system_status(self) -> Dict:
        """Получение статуса системы и статистики"""
        response = self.session.get(f"{self.base_url}/api/status")
        
        if response.status_code == 200:
            return response.json()["status"]
        else:
            error_data = response.json()
            print(f"Не удалось получить статус системы: {error_data}")
            response.raise_for_status()
    
    def get_logs(self, level: Optional[str] = None, limit: int = 100, since: Optional[str] = None) -> List[Dict]:
        """Получение системных логов с опциональной фильтрацией"""
        params = {"limit": limit}
        if level:
            params["level"] = level
        if since:
            params["since"] = since
            
        response = self.session.get(f"{self.base_url}/api/logs", params=params)
        
        if response.status_code == 200:
            return response.json()["logs"]
        else:
            error_data = response.json()
            print(f"Не удалось получить логи: {error_data}")
            response.raise_for_status()
    
    def logout(self) -> Dict:
        """Выход и очистка сессии"""
        response = self.session.post(f"{self.base_url}/auth/logout")
        
        if response.status_code == 200:
            print("Выход успешен")
            return response.json()
        else:
            error_data = response.json()
            print(f"Выход не удался: {error_data}")
            response.raise_for_status()

# Пример использования
def main():
    client = VPNClient("https://ваш-сервер:3000")
    
    try:
        # Вход
        client.login("admin", "пароль")
        
        # Получение текущих сертификатов
        certificates = client.get_certificates()
        print(f"Найдено {len(certificates)} сертификатов")
        
        # Генерация нового сертификата
        ovpn_content = client.generate_certificate("python-клиент", "user@example.com")
        
        # Сохранение сертификата в файл
        with open("python-клиент.ovpn", "wb") as f:
            f.write(ovpn_content)
        print("Сертификат сохранен в python-клиент.ovpn")
        
        # Получение статуса системы
        status = client.get_system_status()
        print(f"Время работы сервера: {status['server']['uptime']} секунд")
        print(f"Подключенные клиенты: {status['openvpn']['connectedClients']}")
        
        # Получение последних ошибок в логах
        error_logs = client.get_logs(level="error", limit=10)
        print(f"Последние ошибки: {len(error_logs)}")
        
        # Выход
        client.logout()
        
    except requests.exceptions.RequestException as e:
        print(f"Ошибка API: {e}")
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    main()
```

## Примеры cURL

### Аутентификация

```bash
# Вход
curl -X POST https://ваш-сервер:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ваш_пароль"}' \
  -c cookies.txt

# Использование сохраненных cookies для последующих запросов
curl -X GET https://ваш-сервер:3000/api/status \
  -b cookies.txt

# Выход
curl -X POST https://ваш-сервер:3000/auth/logout \
  -b cookies.txt
```

### Управление сертификатами

```bash
# Генерация сертификата
curl -X POST https://ваш-сервер:3000/api/generate-cert \
  -H "Content-Type: application/json" \
  -d '{"clientName":"curl-клиент","email":"user@example.com"}' \
  -b cookies.txt \
  -o curl-клиент.ovpn

# Список сертификатов
curl -X GET https://ваш-сервер:3000/api/certificates \
  -b cookies.txt

# Получение деталей сертификата
curl -X GET https://ваш-сервер:3000/api/certificates/1 \
  -b cookies.txt

# Отзыв сертификата
curl -X DELETE https://ваш-сервер:3000/api/certificates/1 \
  -b cookies.txt
```

### Мониторинг системы

```bash
# Проверка работоспособности (без аутентификации)
curl -X GET https://ваш-сервер:3000/health

# Статус системы
curl -X GET https://ваш-сервер:3000/api/status \
  -b cookies.txt

# Получение логов
curl -X GET "https://ваш-сервер:3000/api/logs?level=error&limit=50" \
  -b cookies.txt
```

## Примеры обработки ошибок

### Обработка ошибок JavaScript

```javascript
async function handleAPICall() {
  try {
    const response = await axios.post('/api/generate-cert', {
      clientName: 'тест-клиент'
    }, { withCredentials: true });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // Сервер ответил со статусом ошибки
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('Ошибка валидации:', data.error);
          break;
        case 401:
          console.error('Требуется аутентификация');
          // Перенаправление на страницу входа
          break;
        case 429:
          console.error('Превышен лимит скорости');
          break;
        default:
          console.error('Ошибка API:', data.error);
      }
    } else if (error.request) {
      // Ошибка сети
      console.error('Ошибка сети:', error.message);
    } else {
      // Другая ошибка
      console.error('Ошибка:', error.message);
    }
    
    throw error;
  }
}
```

### Обработка ошибок Python

```python
import requests
from requests.exceptions import RequestException, HTTPError

def handle_api_call():
    try:
        response = requests.post(
            'https://ваш-сервер:3000/api/generate-cert',
            json={'clientName': 'тест-клиент'},
            cookies=cookies
        )
        response.raise_for_status()
        return response.json()
        
    except HTTPError as e:
        status_code = e.response.status_code
        error_data = e.response.json()
        
        if status_code == 400:
            print(f"Ошибка валидации: {error_data['error']}")
        elif status_code == 401:
            print("Требуется аутентификация")
            # Обработка повторной аутентификации
        elif status_code == 429:
            print("Превышен лимит скорости")
        else:
            print(f"Ошибка API: {error_data['error']}")
            
        raise
        
    except RequestException as e:
        print(f"Ошибка сети: {e}")
        raise
```

## Обработка ограничений скорости

### Соблюдение лимитов скорости

```javascript
class RateLimitedClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  async makeRequest(config) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ config, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { config, resolve, reject } = this.requestQueue.shift();

      try {
        const response = await axios(config);
        
        // Проверка заголовков лимита скорости
        const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '0');
        const resetTime = parseInt(response.headers['x-ratelimit-reset'] || '0');
        
        if (remaining <= 1 && resetTime > 0) {
          const waitTime = (resetTime * 1000) - Date.now();
          if (waitTime > 0) {
            console.log(`Приближение к лимиту скорости, ожидание ${waitTime}мс`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
        resolve(response);
      } catch (error) {
        if (error.response?.status === 429) {
          // Превышен лимит скорости, ожидание и повтор
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          console.log(`Превышен лимит скорости, повтор через ${retryAfter} секунд`);
          
          setTimeout(() => {
            this.requestQueue.unshift({ config, resolve, reject });
          }, retryAfter * 1000);
        } else {
          reject(error);
        }
      }
    }

    this.isProcessing = false;
  }
}
```

## Связанные документы

- [API аутентификации](authentication.md)
- [API управления сертификатами](certificates.md)
- [Системный API](system.md)

<!-- auto-added placeholders to match EN structure -->

## Дополнительный раздел (заглушка 1)
