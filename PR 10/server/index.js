const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

const ACCESS_SECRET = 'access_secret_pr10';
const REFRESH_SECRET = 'refresh_secret_pr10';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API курсов (Практика 10)',
      version: '1.0.0',
      description: 'API с JWT и refresh-токенами',
    },
    servers: [{ url: `http://localhost:${port}`, description: 'Локальный сервер' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./index.js'],
};

let users = [];
let products = [];
const refreshTokens = new Set();

function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function generateRefreshToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Отсутствует или неверный заголовок Authorization' });
  }
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалидный или истёкший токен' });
  }
}

function findUserByEmail(email) { return users.find(u => u.email === email); }
function findUserById(id) { return users.find(u => u.id === id); }
function findUserOr404(email, res) {
  const user = findUserByEmail(email);
  if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return null; }
  return user;
}
function findProductById(id) { return products.find(p => p.id === id); }
function findProductOr404(id, res) {
  const product = findProductById(id);
  if (!product) { res.status(404).json({ error: 'Курс не найден' }); return null; }
  return product;
}
async function hashPassword(password) { return bcrypt.hash(password, 10); }
async function verifyPassword(password, hash) { return bcrypt.compare(password, hash); }

products.push(
  { id: nanoid(), title: 'Тайм-менеджмент и продуктивность', category: 'Продуктивность', description: 'Научитесь эффективно планировать день', price: 2990 },
  { id: nanoid(), title: 'Финансовая грамотность', category: 'Финансы', description: 'Основы управления личными финансами', price: 3990 }
);

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(swaggerOptions)));
app.use(express.json());

app.post('/api/auth/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Обязательны поля: email, password, first_name, last_name' });
  }
  if (findUserByEmail(email)) {
    return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
  }
  const newUser = { id: nanoid(), email, first_name, last_name, hashedPassword: await hashPassword(password) };
  users.push(newUser);
  const { hashedPassword, ...userResponse } = newUser;
  res.status(201).json(userResponse);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Обязательны поля email и password' });
  const user = findUserOr404(email, res);
  if (!user) return;
  const ok = await verifyPassword(password, user.hashedPassword);
  if (!ok) return res.status(401).json({ error: 'Неверный пароль' });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);
  res.json({ accessToken, refreshToken });
});

app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = req.body?.refreshToken || (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken обязателен' });
  if (!refreshTokens.has(refreshToken)) return res.status(401).json({ error: 'Невалидный refresh-токен' });
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
    refreshTokens.delete(refreshToken);
    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user);
    refreshTokens.add(newRefresh);
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    return res.status(401).json({ error: 'Невалидный или истёкший refresh-токен' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const { hashedPassword, ...r } = user;
  res.json(r);
});

app.post('/api/products', (req, res) => {
  const { title, category, description, price } = req.body;
  if (!title || !category || description === undefined || price === undefined) {
    return res.status(400).json({ error: 'Обязательны поля: title, category, description, price' });
  }
  const p = { id: nanoid(), title, category, description: description || '', price: Number(price) };
  products.push(p);
  res.status(201).json(p);
});

app.get('/api/products', (req, res) => res.json(products));

app.get('/api/products/:id', authMiddleware, (req, res) => {
  const p = findProductOr404(req.params.id, res);
  if (!p) return;
  res.json(p);
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const p = findProductOr404(req.params.id, res);
  if (!p) return;
  const { title, category, description, price } = req.body;
  if (title !== undefined) p.title = title;
  if (category !== undefined) p.category = category;
  if (description !== undefined) p.description = description;
  if (price !== undefined) p.price = Number(price);
  res.json(p);
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const p = findProductOr404(req.params.id, res);
  if (!p) return;
  products = products.filter(x => x.id !== req.params.id);
  res.json({ message: 'Курс успешно удалён' });
});

app.listen(port, () => {
  console.log(`Сервер: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api-docs`);
});
