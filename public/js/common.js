/* common.js — shared helpers for every page */

// ---------- API ----------
async function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const token = localStorage.getItem('glow_token');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) {
    localStorage.removeItem('glow_token');
  }
  if (!res.ok) {
    let msg = 'Request failed';
    try { msg = (await res.json()).error || msg; } catch (e) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- Cart (per-browser; this is correct for a shopping cart) ----------
function getCart() {
  try { return JSON.parse(localStorage.getItem('glow_cart')) || []; }
  catch (e) { return []; }
}
function saveCart(cart) {
  localStorage.setItem('glow_cart', JSON.stringify(cart));
  updateCartCount();
}
function addToCart(product, qty = 1) {
  const cart = getCart();
  const ex = cart.find(x => x.id === product.id);
  if (ex) ex.qty += qty;
  else cart.push({ id: product.id, name: product.name, price: product.price, img: product.img, qty });
  saveCart(cart);
}
function setQty(id, qty) {
  const cart = getCart();
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
}
function removeFromCart(id) {
  saveCart(getCart().filter(x => x.id !== id));
}
function clearCart() { saveCart([]); }
function cartCount() { return getCart().reduce((a, b) => a + b.qty, 0); }
function cartTotal() { return getCart().reduce((a, b) => a + b.price * b.qty, 0); }
function updateCartCount() {
  document.querySelectorAll('.cart-count').forEach(e => e.textContent = cartCount());
}

// ---------- Misc ----------
function money(n) { return '$' + Number(n).toFixed(2); }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3000);
}

document.addEventListener('DOMContentLoaded', updateCartCount);
