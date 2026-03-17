const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

const ACCESS_SECRET = 'access_secret_pr9';
const REFRESH_SECRET = 'refresh_secret_pr9';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API курсов по саморазвитию (JWT + Refresh)',
      version: '3.0.0',
      description: 'API с JWT и refresh-токенами (Практика 9)',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./index.js'],
};

let users = [];
let products = [];
const refreshTokens = new Set();

// === Генерация токенов ===
function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

// === Middleware аутентификации ===
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Отсутствует или неверный заголовок Authorization',
    });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Невалидный или истёкший токен',
    });
  }
}

// === Вспомогательные функции ===
function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

function findUserById(id) {
  return users.find(u => u.id === id);
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

// Тестовые данные
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
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, first_name, last_name]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               first_name: { type: string }
 *               last_name: { type: string }
 *     responses:
 *       201:
 *         description: Пользователь создан
 *       400:
 *         description: Некорректные данные
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
 *     description: Возвращает пару accessToken и refreshToken
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: accessToken и refreshToken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       400:
 *         description: Отсутствуют обязательные поля
 *       401:
 *         description: Неверные учётные данные
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Обязательны поля email и password' });
  }

  const user = findUserOr404(email, res);
  if (!user) return;

  const isAuthenticated = await verifyPassword(password, user.hashedPassword);
  if (!isAuthenticated) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);

  res.status(200).json({
    accessToken,
    refreshToken,
  });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление токенов
 *     description: Принимает refreshToken из заголовка или тела, возвращает новую пару токенов
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Новая пара accessToken и refreshToken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       400:
 *         description: refreshToken обязателен
 *       401:
 *         description: Невалидный или истёкший refresh-токен
 */
app.post('/api/auth/refresh', (req, res) => {
  const refreshToken =
    req.body?.refreshToken ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

  if (!refreshToken) {
    return res.status(400).json({
      error: 'refreshToken обязателен (в body или заголовке Authorization)',
    });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({
      error: 'Невалидный refresh-токен',
    });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        error: 'Пользователь не найден',
      });
    }

    // Ротация: удаляем старый, создаём новый
    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(401).json({
      error: 'Невалидный или истёкший refresh-токен',
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Текущий пользователь
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Объект текущего пользователя
 *       401:
 *         description: Требуется авторизация
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const userId = req.user.sub;
  const user = findUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const { hashedPassword, ...userResponse } = user;
  res.json(userResponse);
});

// === PRODUCTS ROUTES ===

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

app.get('/api/products', (req, res) => {
  res.status(200).json(products);
});

app.get('/api/products/:id', authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  res.status(200).json(product);
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  const { title, category, description, price } = req.body;
  if (title !== undefined) product.title = title;
  if (category !== undefined) product.category = category;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price);

  res.status(200).json(product);
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  products = products.filter(p => p.id !== req.params.id);
  res.status(200).json({ message: 'Курс успешно удалён' });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api-docs`);
});
