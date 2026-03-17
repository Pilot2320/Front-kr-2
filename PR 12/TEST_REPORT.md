# TEST REPORT — Практика 12 (подготовка к КР №2)

Ниже приведён чек-лист и фактические проверки работоспособности итогового приложения (Практики 7–11).

## 1) Запуск

- Backend запускается командой:
  - `cd server && npm install && npm start`
  - ожидаем в консоли: сервер на `http://localhost:3000`
  - Swagger UI доступен: `http://localhost:3000/api-docs`
- Frontend запускается командой:
  - `cd client && npm install && npm run dev`
  - ожидаем: dev-сервер на `http://127.0.0.1:5173/`

## 2) Smoke-тест API (curl.exe)

Примечание: в PowerShell `curl` — алиас `Invoke-WebRequest`, поэтому для тестов используется **`curl.exe`**.

### 2.1 Регистрация admin (проверено)

Файл запроса: `TEST_DATA_admin_register.json`

Команда:

```bash
curl.exe -s -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  --data-binary "@TEST_DATA_admin_register.json"
```

Ожидаемо: `201` и объект пользователя с `role: "admin"` и `blocked: false`.

### 2.2 Логин (проверено)

Файл запроса: `TEST_DATA_admin_login.json`

Команда:

```bash
curl.exe -s -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  --data-binary "@TEST_DATA_admin_login.json"
```

Ожидаемо: пара `{ accessToken, refreshToken }`.

## 3) Проверка RBAC через UI (ручное тестирование)

### 3.1 user

- Зарегистрироваться с ролью `user`
- После входа:
  - список товаров доступен
  - нет кнопки `+ Создать курс`
  - в карточке товара нет кнопок редактирования/удаления

### 3.2 seller

- Зарегистрироваться с ролью `seller`
- После входа:
  - доступно создание товара
  - доступно редактирование товара
  - **удаление недоступно**
  - раздел `/users` недоступен

### 3.3 admin

- Зарегистрироваться с ролью `admin`
- После входа:
  - доступно создание/редактирование/удаление товаров
  - доступен раздел **Пользователи** (`/users`)
  - можно менять роль пользователям и блокировать пользователей

### 3.4 blocked user

- Зайти под `admin`, перейти в `/users`, заблокировать пользователя
- Попробовать выполнить вход/запросы заблокированным пользователем:
  - ожидаемо `403` с сообщением о блокировке

