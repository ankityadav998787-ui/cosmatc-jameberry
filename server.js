/**
 * server.js — Express API + static site server.
 * Run: npm install && npm start   (defaults to http://localhost:3000)
 */
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
app.use(express.json({ limit: '12mb' }));            // generous limit for base64 product images
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// In-memory session tokens. Cleared on restart (admin just logs in again).
const tokens = new Set();

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (token && tokens.has(token)) return next();
  res.status(401).json({ error: 'Unauthorized. Please sign in again.' });
}

// ---------- Auth ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomBytes(24).toString('hex');
    tokens.add(token);
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid credentials.' });
});

app.post('/api/logout', auth, (req, res) => {
  const token = (req.headers.authorization || '').slice(7);
  tokens.delete(token);
  res.json({ success: true });
});

// ---------- Products (public reads, protected writes) ----------
app.get('/api/products', (req, res) => res.json(db.getProducts()));

app.get('/api/products/:id', (req, res) => {
  const p = db.getProduct(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

app.post('/api/products', auth, (req, res) => {
  const { name, price } = req.body || {};
  if (!name || price === undefined || isNaN(Number(price))) {
    return res.status(400).json({ error: 'Name and a valid price are required.' });
  }
  res.status(201).json(db.addProduct(req.body));
});

app.put('/api/products/:id', auth, (req, res) => {
  const p = db.updateProduct(req.params.id, req.body || {});
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

app.delete('/api/products/:id', auth, (req, res) => {
  const ok = db.deleteProduct(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
});

// ---------- Contact info ----------
app.get('/api/contact', (req, res) => res.json(db.getContact()));
app.put('/api/contact', auth, (req, res) => res.json(db.setContact(req.body || {})));

// ---------- Orders ----------
app.get('/api/orders', auth, (req, res) => res.json(db.getOrders()));

app.post('/api/orders', (req, res) => {
  const { customer, items, total } = req.body || {};
  if (!customer || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Order needs a name and at least one item.' });
  }
  res.status(201).json(db.addOrder(req.body));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Glow Beauty Store running on http://localhost:${PORT}`));
