# Мониторинг безопасности и логирование

## Обзор

Семейный VPN сервер реализует комплексный мониторинг безопасности и логирование для обнаружения, отслеживания и реагирования на события безопасности. Эта система обеспечивает видимость в реальном времени попыток аутентификации, доступа к системе и потенциальных угроз безопасности.

## Архитектура логирования

### Структурированное логирование

Система использует Winston для структурированного логирования в формате JSON с множественными транспортными слоями:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' }),
    new winston.transports.File({ filename: 'logs/application.log' })
  ]
});
```

### Категории логов

#### Логи безопасности (`logs/security-YYYY-MM-DD.log`)
- События аутентификации (успех/неудача)
- Попытки авторизации
- Блокировки и разблокировки аккаунтов
- Операции с сертификатами
- События firewall
- Подозрительные активности

#### Логи приложения (`logs/application-YYYY-MM-DD.log`)
- Запуск и остановка системы
- Изменения конфигурации
- API запросы и ответы
- Метрики производительности
- Общие события приложения

#### Логи ошибок (`logs/error-YYYY-MM-DD.log`)
- Системные ошибки и исключения
- Ошибки, связанные с безопасностью
- Сбои валидации сертификатов
- Проблемы сетевого подключения
- Ошибки конфигурации

## Логирование событий безопасности

### События аутентификации

#### Успешная аутентификация
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Аутентификация успешна",
  "category": "security",
  "event": "auth_success",
  "username": "admin",
  "clientIP": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "sessionId": "sess_abc123def456",
  "correlationId": "req_789ghi012jkl",
  "duration": 245
}
```

#### Неудачная аутентификация
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "warn",
  "message": "Аутентификация не удалась",
  "category": "security",
  "event": "auth_failure",
  "username": "admin",
  "clientIP": "192.168.1.100",
  "error": "Неверные учетные данные",
  "attemptCount": 3,
  "remainingAttempts": 2,
  "correlationId": "req_789ghi012jkl"
}
```

#### Блокировка аккаунта
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "error",
  "message": "Аккаунт заблокирован из-за чрезмерных неудачных попыток",
  "category": "security",
  "event": "account_lockout",
  "username": "admin",
  "clientIP": "192.168.1.100",
  "failedAttempts": 5,
  "lockoutDuration": 900000,
  "correlationId": "req_789ghi012jkl"
}
```

### Операции с сертификатами

#### Генерация сертификата
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Клиентский сертификат сгенерирован",
  "category": "security",
  "event": "cert_generated",
  "clientName": "family-device-01",
  "certificateSerial": "1A2B3C4D5E6F",
  "validFrom": "2025-01-15T10:30:00.000Z",
  "validTo": "2026-01-15T10:30:00.000Z",
  "requestedBy": "admin",
  "clientIP": "192.168.1.100"
}
```

#### Отзыв сертификата
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "warn",
  "message": "Клиентский сертификат отозван",
  "category": "security",
  "event": "cert_revoked",
  "clientName": "family-device-01",
  "certificateSerial": "1A2B3C4D5E6F",
  "revocationReason": "key_compromise",
  "revokedBy": "admin",
  "clientIP": "192.168.1.100"
}
```

### События VPN подключений

#### Подключение клиента
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "VPN клиент подключен",
  "category": "security",
  "event": "vpn_connect",
  "clientName": "family-device-01",
  "clientIP": "10.8.0.2",
  "realIP": "203.0.113.45",
  "bytesReceived": 0,
  "bytesSent": 0,
  "connectionId": "conn_abc123"
}
```

#### Отключение клиента
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "VPN клиент отключен",
  "category": "security",
  "event": "vpn_disconnect",
  "clientName": "family-device-01",
  "clientIP": "10.8.0.2",
  "sessionDuration": 3600,
  "bytesReceived": 1048576,
  "bytesSent": 2097152,
  "connectionId": "conn_abc123"
}
```

### События системной безопасности

#### Изменения правил Firewall
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Правила firewall обновлены",
  "category": "security",
  "event": "firewall_update",
  "action": "rules_applied",
  "rulesCount": 15,
  "modifiedBy": "system",
  "configHash": "sha256:abc123def456"
}
```

#### Изменения конфигурации
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Конфигурация безопасности обновлена",
  "category": "security",
  "event": "config_change",
  "component": "authentication",
  "changes": ["jwt_expiry", "max_failed_attempts"],
  "modifiedBy": "admin",
  "clientIP": "192.168.1.100"
}
```

## Метрики мониторинга

### Метрики аутентификации

#### Отслеживание показателей успеха
```javascript
const authMetrics = {
  totalAttempts: 1000,
  successfulAttempts: 950,
  failedAttempts: 50,
  successRate: 0.95,
  averageResponseTime: 245,
  uniqueUsers: 5,
  uniqueIPs: 8
};
```

#### Анализ неудачных попыток
```javascript
const failureAnalysis = {
  byReason: {
    'invalid_credentials': 35,
    'account_locked': 10,
    'rate_limited': 5
  },
  byIP: {
    '192.168.1.100': 20,
    '203.0.113.45': 15,
    '198.51.100.10': 15
  },
  byTimeOfDay: {
    '00-06': 2,
    '06-12': 15,
    '12-18': 25,
    '18-24': 8
  }
};
```

### Метрики производительности системы

#### Использование ресурсов
```javascript
const systemMetrics = {
  cpu: {
    usage: 15.5,
    loadAverage: [0.8, 0.9, 1.1]
  },
  memory: {
    used: 512000000,
    total: 2048000000,
    percentage: 25.0
  },
  disk: {
    used: 5368709120,
    total: 21474836480,
    percentage: 25.0
  },
  network: {
    bytesIn: 1073741824,
    bytesOut: 2147483648,
    packetsIn: 1000000,
    packetsOut: 1500000
  }
};
```

#### Метрики VPN подключений
```javascript
const vpnMetrics = {
  activeConnections: 5,
  totalConnections: 25,
  averageSessionDuration: 7200,
  totalBytesTransferred: 10737418240,
  connectionsByClient: {
    'family-device-01': 8,
    'family-device-02': 6,
    'family-device-03': 11
  }
};
```

## Обнаружение угроз

### Обнаружение аномалий

#### Обнаружение атак грубой силы
```javascript
const bruteForceDetection = {
  threshold: 5,
  timeWindow: 900000, // 15 минут
  detection: {
    multipleFailures: true,
    rapidAttempts: true,
    distributedAttack: false
  },
  response: {
    accountLockout: true,
    ipBlocking: true,
    alertGeneration: true
  }
};
```

#### Паттерны подозрительной активности
- Множественные неудачные входы с разных IP
- Попытки входа вне обычных часов
- Быстрые запросы генерации сертификатов
- Необычные паттерны VPN подключений
- Высокочастотные API запросы

### Генерация оповещений

#### Критические оповещения безопасности
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "critical",
  "message": "Обнаружена потенциальная атака грубой силы",
  "category": "security_alert",
  "event": "brute_force_detected",
  "details": {
    "targetAccount": "admin",
    "sourceIPs": ["203.0.113.45", "198.51.100.10"],
    "attemptCount": 15,
    "timeWindow": "5 минут",
    "actionTaken": "account_locked"
  },
  "severity": "high",
  "requiresAction": true
}
```

#### Оповещения о здоровье системы
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "warn",
  "message": "Обнаружено высокое использование CPU",
  "category": "system_alert",
  "event": "resource_threshold_exceeded",
  "details": {
    "resource": "cpu",
    "currentUsage": 85.5,
    "threshold": 80.0,
    "duration": "10 минут"
  },
  "severity": "medium",
  "requiresAction": false
}
```

## Управление логами

### Ротация логов

#### Конфигурация автоматической ротации
```javascript
const DailyRotateFile = require('winston-daily-rotate-file');

const rotatingTransport = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d'
});
```

#### Ручное управление логами
```bash
# Сжатие старых логов
gzip logs/application-2025-01-14.log

# Архивирование логов старше 30 дней
find logs/ -name "*.log" -mtime +30 -exec gzip {} \;

# Очистка очень старых логов
find logs/ -name "*.gz" -mtime +90 -delete
```

### Анализ логов

#### Анализ событий безопасности
```bash
# Подсчет неудач аутентификации по IP
grep "auth_failure" logs/security-*.log | \
  jq -r '.clientIP' | sort | uniq -c | sort -nr

# Поиск подозрительных паттернов входа
grep "auth_failure" logs/security-*.log | \
  jq -r 'select(.attemptCount >= 3) | .clientIP' | \
  sort | uniq -c | sort -nr

# Анализ операций с сертификатами
grep "cert_" logs/security-*.log | \
  jq -r '.event' | sort | uniq -c
```

#### Анализ производительности
```bash
# Среднее время ответа
grep "auth_success" logs/application-*.log | \
  jq -r '.duration' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count "ms"}'

# Анализ продолжительности соединений
grep "vpn_disconnect" logs/security-*.log | \
  jq -r '.sessionDuration' | \
  awk '{sum+=$1; count++} END {print "Average session:", sum/count "seconds"}'
```

## Инструменты и скрипты мониторинга

### Скрипт мониторинга безопасности

```bash
#!/bin/bash
# security-monitor.sh

LOG_DIR="logs"
ALERT_THRESHOLD=5
TIME_WINDOW=900 # 15 минут

# Проверка попыток грубой силы
check_brute_force() {
    local recent_failures=$(grep "auth_failure" "$LOG_DIR/security-$(date +%Y-%m-%d).log" | \
        jq -r --arg threshold "$(date -d '15 minutes ago' -Iseconds)" \
        'select(.timestamp > $threshold) | .clientIP' | \
        sort | uniq -c | awk -v thresh="$ALERT_THRESHOLD" '$1 >= thresh')
    
    if [ -n "$recent_failures" ]; then
        echo "ОПОВЕЩЕНИЕ: Обнаружена потенциальная атака грубой силы"
        echo "$recent_failures"
        # Отправить оповещение
        send_alert "brute_force" "$recent_failures"
    fi
}

# Проверка здоровья системы
check_system_health() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        echo "ОПОВЕЩЕНИЕ: Высокое использование CPU: $cpu_usage%"
        send_alert "high_cpu" "$cpu_usage"
    fi
    
    if (( $(echo "$memory_usage > 90" | bc -l) )); then
        echo "ОПОВЕЩЕНИЕ: Высокое использование памяти: $memory_usage%"
        send_alert "high_memory" "$memory_usage"
    fi
}

# Отправка оповещения
send_alert() {
    local alert_type="$1"
    local details="$2"
    
    # Логирование оповещения
    echo "{\"timestamp\":\"$(date -Iseconds)\",\"level\":\"critical\",\"message\":\"Оповещение безопасности: $alert_type\",\"details\":\"$details\"}" >> "$LOG_DIR/alerts.log"
    
    # Дополнительные методы уведомления (email, webhook, и т.д.)
    # curl -X POST "$WEBHOOK_URL" -d "{\"alert\":\"$alert_type\",\"details\":\"$details\"}"
}

# Основной цикл мониторинга
main() {
    while true; do
        check_brute_force
        check_system_health
        sleep 300 # Проверка каждые 5 минут
    done
}

main "$@"
```

### Панель анализа логов

```javascript
// log-dashboard.js
const fs = require('fs');
const path = require('path');

class SecurityDashboard {
    constructor(logDir = 'logs') {
        this.logDir = logDir;
    }
    
    async generateReport() {
        const today = new Date().toISOString().split('T')[0];
        const securityLog = path.join(this.logDir, `security-${today}.log`);
        
        if (!fs.existsSync(securityLog)) {
            console.log('Логи безопасности за сегодня не найдены');
            return;
        }
        
        const logs = fs.readFileSync(securityLog, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            })
            .filter(log => log !== null);
        
        const report = {
            totalEvents: logs.length,
            authSuccesses: logs.filter(log => log.event === 'auth_success').length,
            authFailures: logs.filter(log => log.event === 'auth_failure').length,
            vpnConnections: logs.filter(log => log.event === 'vpn_connect').length,
            certificateOperations: logs.filter(log => log.event?.startsWith('cert_')).length,
            uniqueIPs: [...new Set(logs.map(log => log.clientIP).filter(ip => ip))].length,
            topFailureIPs: this.getTopFailureIPs(logs),
            hourlyActivity: this.getHourlyActivity(logs)
        };
        
        console.log('Отчет безопасности за', today);
        console.log('================================');
        console.log(`Всего событий: ${report.totalEvents}`);
        console.log(`Успешные аутентификации: ${report.authSuccesses}`);
        console.log(`Неудачные аутентификации: ${report.authFailures}`);
        console.log(`VPN подключения: ${report.vpnConnections}`);
        console.log(`Операции с сертификатами: ${report.certificateOperations}`);
        console.log(`Уникальные IP адреса: ${report.uniqueIPs}`);
        
        if (report.topFailureIPs.length > 0) {
            console.log('\nТоп IP с неудачами:');
            report.topFailureIPs.forEach(([ip, count]) => {
                console.log(`  ${ip}: ${count} неудач`);
            });
        }
        
        return report;
    }
    
    getTopFailureIPs(logs) {
        const failures = logs.filter(log => log.event === 'auth_failure');
        const ipCounts = {};
        
        failures.forEach(log => {
            if (log.clientIP) {
                ipCounts[log.clientIP] = (ipCounts[log.clientIP] || 0) + 1;
            }
        });
        
        return Object.entries(ipCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    }
    
    getHourlyActivity(logs) {
        const hourly = new Array(24).fill(0);
        
        logs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hourly[hour]++;
        });
        
        return hourly;
    }
}

// Использование
const dashboard = new SecurityDashboard();
dashboard.generateReport();
```

## Интеграция с внешними системами

### Интеграция SIEM

#### Экспорт Syslog
```javascript
const syslog = require('syslog-client');

const syslogClient = syslog.createClient('siem-server.example.com', {
    port: 514,
    transport: syslog.Transport.Udp
});

function sendToSIEM(logEntry) {
    const message = JSON.stringify(logEntry);
    syslogClient.log(message, syslog.Severity.Informational);
}
```

#### Webhook уведомления
```javascript
const axios = require('axios');

async function sendWebhookAlert(alert) {
    try {
        await axios.post(process.env.WEBHOOK_URL, {
            timestamp: new Date().toISOString(),
            service: 'family-vpn-server',
            alert: alert,
            severity: alert.level
        });
    } catch (error) {
        console.error('Не удалось отправить webhook оповещение:', error.message);
    }
}
```

## Соответствие и хранение

### Политика хранения логов

#### Периоды хранения
- **Логи безопасности**: Минимум 1 год
- **Логи приложения**: 90 дней
- **Логи ошибок**: 6 месяцев
- **Аудит логи**: 7 лет (если требуется соответствием)

#### Требования соответствия
- **Защита данных**: Анонимизация или псевдонимизация персональных данных
- **Контроль доступа**: Ограничение доступа к логам авторизованному персоналу
- **Целостность**: Обеспечение целостности логов с контрольными суммами или подписями
- **Резервное копирование**: Регулярное резервное копирование критических логов безопасности

### Соображения приватности

#### Минимизация данных
- Логировать только необходимую информацию безопасности
- Избегать логирования чувствительных персональных данных
- Использовать correlation ID вместо персональных идентификаторов
- Регулярный пересмотр типов логируемых данных

#### Анонимизация данных
```javascript
function anonymizeIP(ip) {
    const parts = ip.split('.');
    if (parts.length === 4) {
        // Анонимизация последнего октета для IPv4
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return 'anonymized';
}
```

## Устранение проблем мониторинга

### Общие проблемы

#### Отсутствующие логи
- **Причина**: Недостаточно места на диске, проблемы с разрешениями
- **Решение**: Проверить место на диске, проверить разрешения файлов
- **Предотвращение**: Реализовать ротацию логов, мониторить использование диска

#### Влияние на производительность
- **Причина**: Чрезмерное логирование, синхронный I/O
- **Решение**: Оптимизировать уровни логов, использовать асинхронное логирование
- **Предотвращение**: Регулярный мониторинг производительности

#### Повреждение логов
- **Причина**: Сбои системы, ошибки диска
- **Решение**: Восстановить из резервных копий, реализовать контрольные суммы
- **Предотвращение**: Регулярные проверки целостности, избыточное хранение

### Проверки здоровья мониторинга

```bash
# Проверка разрешений файлов логов
ls -la logs/

# Проверка работы ротации логов
ls -la logs/ | grep -E '\.(gz|zip)$'

# Проверка места на диске для логов
df -h logs/

# Проверка работы сервиса логирования
systemctl status winston-logger || ps aux | grep node
```

## Связанная документация

- [Обзор безопасности](overview.md) - Полная архитектура безопасности
- [Система аутентификации](authentication.md) - Детали событий аутентификации
- [Лучшие практики](best-practices.md) - Лучшие практики мониторинга безопасности
- [Устранение неполадок](../troubleshooting/common-issues.md) - Устранение неполадок безопасности
- [Конфигурация](../configuration/environment.md) - Конфигурация логирования