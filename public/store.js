/* store.js — storefront logic */

let PRODUCTS = [];

// ---------- Load products ----------
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  try {
    PRODUCTS = await api('/api/products');
    if (!PRODUCTS.length) {
      grid.innerHTML = '<div class="loading">No products yet. Check back soon!</div>';
      return;
    }
    grid.innerHTML = PRODUCTS.map(p => `
      <div class="card">
        <a class="img-link" href="/product.html?id=${p.id}">
          <img src="${esc(p.img)}" alt="${esc(p.name)}" onerror="this.src='https://via.placeholder.com/400x300?text=${encodeURIComponent(p.name)}'">
        </a>
        <div class="card-content">
          <h3 onclick="location.href='/product.html?id=${p.id}'">${esc(p.name)}</h3>
          <p>${esc(p.desc)}</p>
          <div class="price">${money(p.price)}</div>
          <p class="price-note">Free shipping over $40 | 30-day returns</p>
          <button class="btn" onclick="quickAdd(${p.id})">Add to Cart</button>
        </div>
      </div>`).join('');
  } catch (e) {
    grid.innerHTML = `<div class="loading">Couldn't load products: ${esc(e.message)}</div>`;
  }
}

function quickAdd(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  addToCart(p, 1);
  toast(`${p.name} added to cart!`);
}

// ---------- Contact info injection ----------
async function loadContact() {
  let c;
  try { c = await api('/api/contact'); } catch (e) { return; }
  const addrHtml = `${esc(c.addr1)}<br>${esc(c.addr2)}<br>United States`;
  document.querySelectorAll('[data-contact="phone"]').forEach(e => e.textContent = c.phone);
  document.querySelectorAll('[data-contact="email"]').forEach(e => e.textContent = c.email);
  document.querySelectorAll('[data-contact="address"]').forEach(e => e.innerHTML = addrHtml);
  document.querySelectorAll('[data-contact="hours"]').forEach(e => e.textContent = c.hours);
  document.querySelectorAll('[data-contact="map"]').forEach(e => e.textContent = `📍 ${c.addr1}, ${c.addr2}`);
  document.querySelectorAll('[data-contact="phone-foot"]').forEach(e => e.textContent = '📞 ' + c.phone);
  document.querySelectorAll('[data-contact="email-foot"]').forEach(e => e.textContent = '✉️ ' + c.email);
  document.querySelectorAll('[data-contact="address-foot"]').forEach(e => e.innerHTML = '🏢 ' + esc(c.addr1) + '<br>' + esc(c.addr2));
  document.querySelectorAll('[data-contact="hours-foot"]').forEach(e => e.textContent = c.hours);
}

// ---------- SPA pages ----------
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
  const nav = document.getElementById('nav-' + name);
  if (nav) nav.classList.add('active');
  if (name === 'checkout') renderCart();
  window.scrollTo(0, 0);
  history.replaceState(null, '', name === 'home' ? '/' : '/?page=' + name);
}

// ---------- Cart / checkout ----------
function renderCart() {
  const box = document.getElementById('cart-summary');
  const forms = document.getElementById('checkout-forms');
  const cart = getCart();
  if (!cart.length) {
    box.innerHTML = '<p style="color:#aaa;font-size:14px">Your cart is empty. <a onclick="showPage(\'home\')" style="color:#ff4f87;cursor:pointer">Keep shopping →</a></p>';
    if (forms) forms.style.display = 'none';
    return;
  }
  if (forms) forms.style.display = 'block';
  box.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div class="ci-left">
        <img src="${esc(i.img)}" alt="${esc(i.name)}" onerror="this.src='https://via.placeholder.com/48?text=%E2%9C%A8'">
        <span>${esc(i.name)}</span>
      </div>
      <div class="ci-qty">
        <button onclick="changeQty(${i.id},-1)">−</button>
        <span>${i.qty}</span>
        <button onclick="changeQty(${i.id},1)">+</button>
      </div>
      <span style="min-width:64px;text-align:right">${money(i.price * i.qty)}</span>
      <button class="ci-remove" title="Remove" onclick="dropItem(${i.id})">🗑</button>
    </div>`).join('') +
    `<div class="cart-total"><span>Total</span><span>${money(cartTotal())}</span></div>`;
}

function changeQty(id, delta) {
  const item = getCart().find(x => x.id === id);
  if (!item) return;
  if (item.qty + delta <= 0) { dropItem(id); return; }
  setQty(id, item.qty + delta);
  renderCart();
}
function dropItem(id) { removeFromCart(id); renderCart(); }

async function placeOrder() {
  const cart = getCart();
  if (!cart.length) { toast('Your cart is empty.'); return; }
  const name = document.getElementById('co-name').value.trim();
  const email = document.getElementById('co-email').value.trim();
  const address = document.getElementById('co-address').value.trim();
  const city = document.getElementById('co-city').value.trim();
  if (!name || !email) { toast('Please enter your name and email.'); return; }

  try {
    const order = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer: name, email,
        address: [address, city].filter(Boolean).join(', '),
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        total: cartTotal()
      })
    });
    clearCart();
    document.getElementById('cart-summary').innerHTML = `
      <div class="order-success">
        <h3>✅ Order placed!</h3>
        <p>Thank you, ${esc(name)}. Your order <strong>#ORD-${10000 + order.id}</strong> is confirmed.</p>
        <p style="margin-top:6px">A confirmation has been sent to ${esc(email)}.</p>
        <button class="btn secondary" style="width:auto;margin-top:14px;display:inline-block" onclick="showPage('home')">Continue Shopping</button>
      </div>`;
    document.getElementById('checkout-forms').style.display = 'none';
    toast('Order placed successfully!');
  } catch (e) {
    toast('Could not place order: ' + e.message);
  }
}

// ---------- Contact form ----------
function sendContactMessage() {
  const name = document.getElementById('cf-name').value.trim();
  const msg = document.getElementById('cf-message').value.trim();
  if (!name || !msg) { toast('Please add your name and a message.'); return; }
  ['cf-name', 'cf-email', 'cf-order', 'cf-message'].forEach(id => document.getElementById(id).value = '');
  toast("Message sent! We'll reply within 24 hours.");
}

// ---------- Init ----------
(function init() {
  loadProducts();
  loadContact();
  const page = new URLSearchParams(location.search).get('page');
  if (page && document.getElementById('page-' + page)) showPage(page);
})();
