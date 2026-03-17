const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API курсов по саморазвитию',
      version: '1.0.0',
      description: 'API с аутентификацией и CRUD для каталога курсов по саморазвитию',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер',
      },
    ],
  },
  apis: ['./index.js'],
};

let users = [];
let products = [];

// === Вспомогательные функции ===
function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

function findUserOr404(email, res) {
  const user = findUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return null;
  }
  return user;
}

function findProductById(id) {
  return products.find(p => p.id === id);
}

function findProductOr404(id, res) {
  const product = findProductById(id);
  if (!product) {
    res.status(404).json({ error: 'Курс не найден' });
    return null;
  }
  return product;
}

async function hashPassword(password) {
  const rounds = 10;
  return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

// Тестовые данные для демонстрации (курсы по саморазвитию)
products.push(
  {
    id: nanoid(),
    title: 'Тайм-менеджмент и продуктивность',
    category: 'Продуктивность',
    description: 'Научитесь эффективно планировать день и достигать целей',
    price: 2990,
  },
  {
    id: nanoid(),
    title: 'Финансовая грамотность',
    category: 'Финансы',
    description: 'Основы управления личными финансами и инвестирования',
    price: 3990,
  }
);

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());

app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      console.log('Body:', req.body);
    }
  });
  next();
});

// === AUTH ROUTES ===

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     description: Создаёт нового пользователя с хешированным паролем
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan@example.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *               first_name:
 *                 type: string
 *                 example: Иван
 *               last_name:
 *                 type: string
 *                 example: Петров
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *       400:
 *         description: Некорректные данные или email уже занят
 */
app.post('/api/auth/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({
      error: 'Обязательны поля: email, password, first_name, last_name',
    });
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
  }

  const newUser = {
    id: nanoid(),
    email,
    first_name,
    last_name,
    hashedPassword: await hashPassword(password),
  };
  users.push(newUser);

  const { hashedPassword, ...userResponse } = newUser;
  res.status(201).json(userResponse);
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Проверяет email и пароль пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan@example.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *       400:
 *         description: Отсутствуют обязательные поля
 *       401:
 *         description: Неверные учётные данные
 *       404:
 *         description: Пользователь не найден
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Обязательны поля email и password' });
  }

  const user = findUserOr404(email, res);
  if (!user) return;

  const isAuthenticated = await verifyPassword(password, user.hashedPassword);
  if (isAuthenticated) {
    res.status(200).json({ login: true, user: { id: user.id, email: user.email } });
  } else {
    res.status(401).json({ error: 'Неверный пароль' });
  }
});

// === PRODUCTS ROUTES ===

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать курс
 *     description: Добавляет новый курс в каталог
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - description
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *                 example: Освоение навыков коммуникации
 *               category:
 *                 type: string
 *                 example: Личностный рост
 *               description:
 *                 type: string
 *                 example: Развитие навыков общения и переговоров
 *               price:
 *                 type: number
 *                 example: 4990
 *     responses:
 *       201:
 *         description: Курс успешно создан
 *       400:
 *         description: Некорректные данные
 */
app.post('/api/products', (req, res) => {
  const { title, category, description, price } = req.body;

  if (!title || !category || description === undefined || price === undefined) {
    return res.status(400).json({
      error: 'Обязательны поля: title, category, description, price',
    });
  }

  const newProduct = {
    id: nanoid(),
    title,
    category,
    description: description || '',
    price: Number(price),
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список курсов
 *     description: Возвращает все курсы по саморазвитию
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список курсов
 */
app.get('/api/products', (req, res) => {
  res.status(200).json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить курс по id
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Курс найден
 *       404:
 *         description: Курс не найден
 */
app.get('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  res.status(200).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить курс
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Курс обновлён
 *       404:
 *         description: Курс не найден
 */
app.put('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  const { title, category, description, price } = req.body;

  if (title !== undefined) product.title = title;
  if (category !== undefined) product.category = category;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price);

  res.status(200).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить курс
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Курс удалён
 *       404:
 *         description: Курс не найден
 */
app.delete('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  products = products.filter(p => p.id !== req.params.id);
  res.status(200).json({ message: 'Курс успешно удалён' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api-docs`);
});
