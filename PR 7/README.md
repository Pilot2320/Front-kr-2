# Практическое занятие 7 — API курсов по саморазвитию

Серверное приложение на Node.js с аутентификацией (bcrypt) и CRUD для каталога курсов по саморазвитию.

## Установка

```bash
npm install
```

## Запуск

```bash
npm start
```

Сервер: http://localhost:3000  
Swagger UI: http://localhost:3000/api-docs

## Маршруты API

| Маршрут | Метод | Описание |
|---------|-------|----------|
| /api/auth/register | POST | Регистрация пользователя |
| /api/auth/login | POST | Вход в систему (логин — email) |
| /api/products | POST | Создать курс |
| /api/products | GET | Получить список курсов |
| /api/products/:id | GET | Получить курс по id |
| /api/products/:id | PUT | Обновить курс |
| /api/products/:id | DELETE | Удалить курс |

## Сущности

### Пользователь (User)
- `id` — уникальный идентификатор
- `email` — email (используется как логин)
- `first_name` — имя
- `last_name` — фамилия
- `password` — хешируется через bcrypt

### Курс/Товар (Product)
- `id` — уникальный идентификатор
- `title` — название курса
- `category` — категория (Продуктивность, Финансы, Личностный рост и т.д.)
- `description` — описание
- `price` — цена (руб.)

## Примеры запросов

### Регистрация
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ivan@example.com","password":"qwerty123","first_name":"Иван","last_name":"Петров"}'
```

### Вход
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ivan@example.com","password":"qwerty123"}'
```

### Создать курс
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"title":"Тайм-менеджмент","category":"Продуктивность","description":"Управление временем","price":2990}'
```
