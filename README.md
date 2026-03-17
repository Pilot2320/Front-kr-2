# KR2 — API курсов по саморазвитию (Практики 7–11) + финальная подготовка (Практика 12)

Итоговый проект по курсу **«Фронтенд и бэкенд разработка»** (4 семестр, 2025/2026).  
Контрольная работа №2 — результат выполнения практических занятий **7–11**.  
Практика **12** — подготовка к сдаче: проверка работоспособности и оформление отчёта.

---

## Стек технологий

| Слой | Технологии |
|------|------------|
| Фронтенд | React (Vite), Axios, React Router |
| Бэкенд | Node.js, Express.js, bcrypt, jsonwebtoken, nanoid |
| Документация API | Swagger (swagger-jsdoc + swagger-ui-express) |
| Тестирование | Swagger UI / Postman / `curl.exe` |

---

## Связь с практическими занятиями (7–11)

### Практика 7 — Базовый backend + CRUD товаров
Файл: `server/index.js`

- Реализован CRUD каталога товаров (курсов): `POST/GET/GET:id/PUT/DELETE`
- Используются in-memory массивы `products`, генерация id через `nanoid`
- Подключена документация Swagger

### Практика 8 — JWT access-токен + защищённые маршруты
Файл: `server/index.js`

- `POST /api/auth/login` выдаёт **accessToken**
- `GET /api/auth/me` возвращает текущего пользователя
- Защита маршрутов через middleware (проверка `Authorization: Bearer <token>`)

### Практика 9 — Refresh-токены
Файл: `server/index.js`

- `POST /api/auth/login` выдаёт пару **access + refresh**
- `POST /api/auth/refresh` обновляет пару токенов (ротация refresh)
- refresh-токены хранятся на сервере в `Set`

### Практика 10 — Фронтенд + автоматизация токенов
Файлы: `client/src/api.js`, `client/src/AuthContext.jsx`, `client/src/pages/*`

- Токены хранятся в **localStorage**
- Axios interceptors:
  - подстановка access-токена в каждый запрос
  - авто-refresh при `401` и повтор исходного запроса
- UI для управления товарами (список/создание/детали/обновление/удаление)

### Практика 11 — RBAC (роли) + управление пользователями
Файлы: `server/index.js`, `client/src/pages/UsersAdmin.jsx`

- Роли: `user`, `seller`, `admin` (вшиты в JWT)
- `roleMiddleware(allowedRoles)` ограничивает доступ к эндпоинтам
- Админ-управление пользователями: список, изменение роли, блокировка

---

## Структура проекта

```
PR 12/
├── server/                 # Express API (Практики 7–9, 11)
│   ├── index.js
│   ├── package.json
│   └── ...
├── client/                 # React UI (Практика 10–11)
│   ├── src/
│   │   ├── api.js
│   │   ├── AuthContext.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── ProductsList.jsx
│   │       ├── ProductDetail.jsx
│   │       ├── ProductForm.jsx
│   │       └── UsersAdmin.jsx
│   └── ...
├── TEST_REPORT.md          # Практика 12: результаты/чек-лист тестирования
├── TEST_DATA_admin_*.json  # Данные для smoke-тестов через curl.exe
└── README.md
```

---

## Запуск

### Бэкенд
```bash
cd server
npm install
npm start
# → http://localhost:3000
# → Swagger: http://localhost:3000/api-docs
```

### Фронтенд
```bash
cd client
npm install
npm run dev
# → http://127.0.0.1:5173
```

---

## RBAC роли и права

- **user**: просмотр товаров
- **seller**: создание/редактирование товаров + просмотр
- **admin**: права seller + удаление товаров + управление пользователями

Таблица доступа соответствует Практике 11:

| Маршрут | Метод | Доступ |
|---|---:|---|
| `/api/auth/register` | POST | Гость |
| `/api/auth/login` | POST | Гость |
| `/api/auth/refresh` | POST | Гость |
| `/api/auth/me` | GET | `user/seller/admin` |
| `/api/users` | GET | `admin` |
| `/api/users/:id` | GET | `admin` |
| `/api/users/:id` | PUT | `admin` |
| `/api/users/:id` | DELETE | `admin` (блокировка пользователя) |
| `/api/products` | POST | `seller/admin` |
| `/api/products` | GET | `user/seller/admin` |
| `/api/products/:id` | GET | `user/seller/admin` |
| `/api/products/:id` | PUT | `seller/admin` |
| `/api/products/:id` | DELETE | `admin` |

---

## Тестирование (Практика 12)

Подробный чек-лист и шаги проверки находятся в `TEST_REPORT.md`.


