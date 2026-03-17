const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

const ACCESS_SECRET = 'access_secret_pr11';
const REFRESH_SECRET = 'refresh_secret_pr11';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API курсов по саморазвитию (RBAC) — Практика 11',
      version: '1.1.0',
      description: 'JWT access/refresh + RBAC роли (user/seller/admin) + управление пользователями',
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
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Отсутствует или неверный заголовок Authorization' });
  }
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const dbUser = users.find(u => u.id === payload.sub);
    if (!dbUser) return res.status(401).json({ error: 'Пользователь не найден' });
    if (dbUser.blocked) return res.status(403).json({ error: 'Пользователь заблокирован' });
    req.user = payload;
    req.dbUser = dbUser;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалидный или истёкший токен' });
  }
}

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
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

function sanitizeUser(user) {
  const { hashedPassword, ...safe } = user;
  return safe;
}

products.push(
  { id: nanoid(), title: 'Тайм-менеджмент и продуктивность', category: 'Продуктивность', description: 'Научитесь эффективно планировать день', price: 2990 },
  { id: nanoid(), title: 'Финансовая грамотность', category: 'Финансы', description: 'Основы управления личными финансами', price: 3990 }
);

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(swaggerOptions)));
app.use(express.json());

app.post('/api/auth/register', async (req, res) => {
  const { email, password, first_name, last_name, role } = req.body;
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Обязательны поля: email, password, first_name, last_name' });
  }
  if (findUserByEmail(email)) {
    return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
  }
  const newUser = {
    id: nanoid(),
    email,
    first_name,
    last_name,
    role: role || 'user',
    blocked: false,
    hashedPassword: await hashPassword(password),
  };
  users.push(newUser);
  res.status(201).json(sanitizeUser(newUser));
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Обязательны поля email и password' });
  const user = findUserOr404(email, res);
  if (!user) return;
  if (user.blocked) return res.status(403).json({ error: 'Пользователь заблокирован' });
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
    if (user.blocked) return res.status(403).json({ error: 'Пользователь заблокирован' });
    refreshTokens.delete(refreshToken);
    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user);
    refreshTokens.add(newRefresh);
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    return res.status(401).json({ error: 'Невалидный или истёкший refresh-токен' });
  }
});

app.get('/api/auth/me', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
  res.json(sanitizeUser(req.dbUser));
});

// === USERS (admin only) ===
app.get('/api/users', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  res.json(users.map(sanitizeUser));
});

app.get('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(sanitizeUser(user));
});

app.put('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const { email, first_name, last_name, role, blocked, password } = req.body;
  if (email !== undefined) user.email = email;
  if (first_name !== undefined) user.first_name = first_name;
  if (last_name !== undefined) user.last_name = last_name;
  if (role !== undefined) user.role = role;
  if (blocked !== undefined) user.blocked = Boolean(blocked);
  if (password) user.hashedPassword = await hashPassword(password);

  res.json(sanitizeUser(user));
});

// "DELETE" = блокировка пользователя
app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  user.blocked = true;
  res.json({ message: 'Пользователь заблокирован', user: sanitizeUser(user) });
});

// === PRODUCTS (RBAC) ===
app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
  const { title, category, description, price } = req.body;
  if (!title || !category || description === undefined || price === undefined) {
    return res.status(400).json({ error: 'Обязательны поля: title, category, description, price' });
  }
  const p = { id: nanoid(), title, category, description: description || '', price: Number(price) };
  products.push(p);
  res.status(201).json(p);
});

app.get('/api/products', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => res.json(products));

app.get('/api/products/:id', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
  const p = findProductOr404(req.params.id, res);
  if (!p) return;
  res.json(p);
});

app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
  const p = findProductOr404(req.params.id, res);
  if (!p) return;
  const { title, category, description, price } = req.body;
  if (title !== undefined) p.title = title;
  if (category !== undefined) p.category = category;
  if (description !== undefined) p.description = description;
  if (price !== undefined) p.price = Number(price);
  res.json(p);
});

app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const p = findProductOr404(req.params.id, res);
  if (!p) return;
  products = products.filter(x => x.id !== req.params.id);
  res.json({ message: 'Курс успешно удалён' });
});

app.listen(port, () => {
  console.log(`Сервер: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api-docs`);
});
