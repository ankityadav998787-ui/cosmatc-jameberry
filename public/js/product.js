/* product.js — single product page */

let CURRENT = null;

function getId() {
  return Number(new URLSearchParams(location.search).get('id'));
}

async function load() {
  const root = document.getElementById('product-root');
  const id = getId();
  if (!id) { root.innerHTML = notFound(); return; }
  try {
    CURRENT = await api('/api/products/' + id);
  } catch (e) {
    root.innerHTML = notFound(e.message);
    return;
  }
  document.title = CURRENT.name + ' — Glow Beauty Store';
  document.getElementById('bc-name').textContent = CURRENT.name;

  root.innerHTML = `
    <div class="product-detail">
      <img class="pd-img" src="${esc(CURRENT.img)}" alt="${esc(CURRENT.name)}"
           onerror="this.src='https://via.placeholder.com/600x450?text=${encodeURIComponent(CURRENT.name)}'">
      <div class="pd-info">
        <h1>${esc(CURRENT.name)}</h1>
        <div class="pd-price">${money(CURRENT.price)}</div>
        <div class="pd-badges">
          <span class="pd-badge">🚚 Free shipping over $40</span>
          <span class="pd-badge">🔄 30-day returns</span>
          <span class="pd-badge">🔒 Secure checkout</span>
        </div>
        <p class="pd-desc">${esc(CURRENT.desc)}</p>
        <div class="qty-row">
          <label>Quantity</label>
          <div class="qty-control">
            <button onclick="bump(-1)">−</button>
            <input id="pd-qty" type="number" min="1" value="1">
            <button onclick="bump(1)">+</button>
          </div>
        </div>
        <div class="pd-actions">
          <button class="btn secondary" onclick="addCurrent(false)">Add to Cart</button>
          <button class="btn" onclick="addCurrent(true)">Buy Now</button>
        </div>
      </div>
    </div>`;

  loadRelated(id);
  loadContactFooter();
}

function bump(delta) {
  const input = document.getElementById('pd-qty');
  input.value = Math.max(1, (parseInt(input.value, 10) || 1) + delta);
}

function addCurrent(buyNow) {
  const qty = Math.max(1, parseInt(document.getElementById('pd-qty').value, 10) || 1);
  addToCart(CURRENT, qty);
  if (buyNow) { location.href = '/?page=checkout'; return; }
  toast(`${CURRENT.name} (×${qty}) added to cart!`);
}

async function loadRelated(currentId) {
  try {
    const all = await api('/api/products');
    const others = all.filter(p => p.id !== currentId).slice(0, 4);
    if (!others.length) return;
    document.getElementById('related-grid').innerHTML = others.map(p => `
      <div class="card">
        <a class="img-link" href="/product.html?id=${p.id}">
          <img src="${esc(p.img)}" alt="${esc(p.name)}" onerror="this.src='https://via.placeholder.com/400x300?text=${encodeURIComponent(p.name)}'">
        </a>
        <div class="card-content">
          <h3 onclick="location.href='/product.html?id=${p.id}'">${esc(p.name)}</h3>
          <div class="price">${money(p.price)}</div>
          <button class="btn" onclick="location.href='/product.html?id=${p.id}'">View</button>
        </div>
      </div>`).join('');
    document.getElementById('related-wrap').style.display = 'block';
  } catch (e) { /* ignore */ }
}

async function loadContactFooter() {
  try {
    const c = await api('/api/contact');
    document.querySelectorAll('[data-contact="phone-foot"]').forEach(e => e.textContent = '📞 ' + c.phone);
    document.querySelectorAll('[data-contact="email-foot"]').forEach(e => e.textContent = '✉️ ' + c.email);
  } catch (e) { /* ignore */ }
}

function notFound(msg) {
  return `<div class="loading" style="padding:80px">
    Product not found${msg ? ' — ' + esc(msg) : ''}.<br><br>
    <a href="/" style="color:#ff4f87">← Back to shop</a>
  </div>`;
}

load();
