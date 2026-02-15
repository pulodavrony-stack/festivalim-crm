# Festivalim CRM — Инструкция по развёртыванию

## Рекомендуемая конфигурация сервера

Для максимальной скорости работы в Воронеже рекомендуем:

| Параметр | Рекомендация |
|----------|--------------|
| **Хостинг** | Timeweb Cloud или Selectel |
| **Дата-центр** | Москва (задержка до Воронежа ~15-20ms) |
| **CPU** | 4 vCPU (минимум 2) |
| **RAM** | 8 ГБ (минимум 4 ГБ) |
| **Диск** | 80-100 ГБ NVMe SSD |
| **ОС** | Ubuntu 24.04 LTS |
| **Стоимость** | ~2000-3000 ₽/мес |

---

## Шаг 1: Подготовка сервера

### 1.1 Подключитесь к серверу

```bash
ssh root@YOUR_SERVER_IP
```

### 1.2 Обновите систему

```bash
apt update && apt upgrade -y
```

### 1.3 Установите Docker

```bash
# Установка Docker
curl -fsSL https://get.docker.com | sh

# Добавление пользователя в группу docker
usermod -aG docker $USER

# Установка Docker Compose
apt install docker-compose-plugin -y

# Проверка
docker --version
docker compose version
```

### 1.4 Установите дополнительные утилиты

```bash
apt install -y git curl wget htop ncdu
```

### 1.5 Настройте firewall

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 1.6 Настройте swap (для 4 ГБ RAM)

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Шаг 2: Клонирование проекта

```bash
# Создайте директорию
mkdir -p /opt/festivalim
cd /opt/festivalim

# Клонируйте репозиторий (или загрузите файлы)
git clone https://github.com/YOUR_REPO/festivalim-crm-v2.git .

# Или загрузите через scp с локального компьютера:
# scp -r /path/to/festivalim-crm-v2/* root@SERVER_IP:/opt/festivalim/
```

---

## Шаг 3: Настройка окружения

### 3.1 Сгенерируйте ключи

```bash
./scripts/generate-keys.sh
```

Сохраните сгенерированные ключи!

### 3.2 Создайте JWT ключи для Supabase

```bash
# Установите Node.js (если не установлен)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Создайте скрипт генерации
cat > /tmp/generate-jwt.js << 'EOF'
const crypto = require('crypto');

const JWT_SECRET = process.argv[2] || 'your-jwt-secret';

function base64url(source) {
  return Buffer.from(source)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedHeader + '.' + encodedPayload)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return encodedHeader + '.' + encodedPayload + '.' + signature;
}

const now = Math.floor(Date.now() / 1000);
const tenYears = 10 * 365 * 24 * 60 * 60;

console.log('SUPABASE_ANON_KEY:');
console.log(createJWT({ role: 'anon', iss: 'supabase', iat: now, exp: now + tenYears }, JWT_SECRET));

console.log('\nSUPABASE_SERVICE_KEY:');
console.log(createJWT({ role: 'service_role', iss: 'supabase', iat: now, exp: now + tenYears }, JWT_SECRET));
EOF

# Запустите с вашим JWT_SECRET
node /tmp/generate-jwt.js YOUR_JWT_SECRET_HERE
```

### 3.3 Создайте файл окружения

```bash
cp .env.production.example .env.production
nano .env.production
```

Заполните все значения из сгенерированных ключей.

---

## Шаг 4: Настройка DNS

В панели управления вашим доменом добавьте записи:

| Тип | Имя | Значение |
|-----|-----|----------|
| A | crm | IP_ВАШЕГО_СЕРВЕРА |
| A | studio | IP_ВАШЕГО_СЕРВЕРА |

Подождите 5-10 минут для распространения DNS.

---

## Шаг 5: Развёртывание

### 5.1 Запустите развёртывание

```bash
./scripts/deploy.sh
```

### 5.2 Настройте SSL сертификаты

```bash
# Отредактируйте email в скрипте
nano scripts/ssl-init.sh

# Запустите
./scripts/ssl-init.sh
```

---

## Шаг 6: Проверка работы

### 6.1 Проверьте контейнеры

```bash
docker compose ps
```

Все контейнеры должны быть в статусе "Up" или "healthy".

### 6.2 Проверьте логи

```bash
# Все логи
docker compose logs -f

# Логи приложения
docker compose logs -f app

# Логи базы данных
docker compose logs -f postgres
```

### 6.3 Проверьте health endpoint

```bash
curl https://crm.festivalim.ru/api/health
```

---

## Шаг 7: Настройка бэкапов

### 7.1 Автоматические бэкапы

```bash
# Добавьте в cron (ежедневно в 3:00)
crontab -e

# Добавьте строку:
0 3 * * * /opt/festivalim/scripts/backup.sh >> /var/log/festivalim-backup.log 2>&1
```

### 7.2 Ручной бэкап

```bash
./scripts/backup.sh
```

### 7.3 Восстановление из бэкапа

```bash
./scripts/restore.sh /backups/festivalim_backup_YYYYMMDD_HHMMSS.tar.gz
```

---

## Полезные команды

### Перезапуск приложения

```bash
docker compose restart app
```

### Обновление приложения

```bash
git pull
docker compose build app
docker compose up -d app
```

### Просмотр ресурсов

```bash
docker stats
htop
```

### Очистка Docker

```bash
docker system prune -a --volumes
```

### Проверка дискового пространства

```bash
df -h
ncdu /
```

---

## Мониторинг производительности

### Проверка задержки до базы данных

```bash
docker compose exec app sh -c "time wget -qO- http://supabase-kong:8000/rest/v1/ > /dev/null"
```

### Проверка использования памяти

```bash
docker stats --no-stream
```

### Проверка логов Nginx

```bash
docker compose logs nginx | tail -100
```

---

## Устранение неполадок

### Приложение не запускается

```bash
# Проверьте логи
docker compose logs app

# Пересоберите образ
docker compose build --no-cache app
docker compose up -d app
```

### База данных недоступна

```bash
# Проверьте статус
docker compose exec postgres pg_isready

# Перезапустите
docker compose restart postgres
```

### SSL не работает

```bash
# Проверьте сертификаты
ls -la docker/certbot/conf/live/

# Перезапустите Nginx
docker compose restart nginx
```

### Недостаточно памяти

```bash
# Проверьте использование
free -h

# Увеличьте swap
fallocate -l 8G /swapfile2
mkswap /swapfile2
swapon /swapfile2
```

---

## Контакты поддержки

- Email: support@festivalim.ru
- Телефон: +7 (XXX) XXX-XX-XX

---

*Последнее обновление: Февраль 2026*
