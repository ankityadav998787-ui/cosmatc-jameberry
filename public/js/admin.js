/* admin.js — admin panel logic (talks to the API with a bearer token) */

let A_PRODUCTS = [];
let editingId = null;
let modalImg = '';   // single source of truth for the product image

// ---------- Auth ----------
async function doLogin() {
  const username = document.getElementById('admin-user').value.trim();
  const password = document.getElementById('admin-pass').value;
  try {
    const { token } = await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    localStorage.setItem('glow_token', token);
    showPanel();
  } catch (e) {
    toast(e.message || 'Login failed');
  }
}

async function doLogout() {
  try { await api('/api/logout', { method: 'POST' }); } catch (e) {}
  localStorage.removeItem('glow_token');
  document.getElementById('panel-view').style.display = 'none';
  document.getElementById('login-view').style.display = 'block';
  document.getElementById('admin-pass').value = '';
}

function showPanel() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('panel-view').style.display = 'block';
  loadProducts();
  loadContact();
  loadOrders();
}

function tab(ev, name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  if (ev && ev.currentTarget) ev.currentTarget.classList.add('active');
}

// ---------- Products ----------
async function loadProducts() {
  try {
    A_PRODUCTS = await api('/api/products');
  } catch (e) { toast('Could not load products'); return; }
  document.getElementById('stat-products').textContent = A_PRODUCTS.length;
  document.getElementById('admin-products-grid').innerHTML = A_PRODUCTS.map(p => `
    <div class="product-admin-card">
      <img src="${esc(p.img)}" alt="${esc(p.name)}" onerror="this.src='https://via.placeholder.com/280x160?text=${encodeURIComponent(p.name)}'">
      <div class="pad">
        <h4>${esc(p.name)}</h4>
        <p>${money(p.price)} — ${esc((p.desc || '').substring(0, 50))}${(p.desc || '').length > 50 ? '…' : ''}</p>
        <div class="admin-actions">
          <button class="edit-btn" onclick="openEdit(${p.id})">✏️ Edit</button>
          <button class="del-btn" onclick="removeProduct(${p.id})">🗑 Delete</button>
        </div>
      </div>
    </div>`).join('');
}

function openAdd() {
  editingId = null;
  modalImg = '';
  document.getElementById('modal-title').textContent = 'Add Product';
  document.getElementById('m-name').value = '';
  document.getElementById('m-desc').value = '';
  document.getElementById('m-price').value = '';
  document.getElementById('m-imgurl').value = '';
  const prev = document.getElementById('photo-preview');
  prev.removeAttribute('src');
  prev.style.display = 'none';
  document.getElementById('upload-hint').style.display = 'block';
  document.getElementById('edit-modal').classList.add('open');
}

function openEdit(id) {
  const p = A_PRODUCTS.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  modalImg = p.img || '';
  document.getElementById('modal-title').textContent = 'Edit Product';
  document.getElementById('m-name').value = p.name;
  document.getElementById('m-desc').value = p.desc;
  document.getElementById('m-price').value = p.price;
  document.getElementById('m-imgurl').value = (p.img && p.img.startsWith('data:')) ? '' : p.img;
  const prev = document.getElementById('photo-preview');
  prev.src = p.img;
  prev.style.display = 'block';
  document.getElementById('upload-hint').style.display = 'none';
  document.getElementById('edit-modal').classList.add('open');
}

function closeModal() { document.getElementById('edit-modal').classList.remove('open'); }

function previewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    modalImg = e.target.result;            // base64 data URL
    document.getElementById('m-imgurl').value = '';
    const prev = document.getElementById('photo-preview');
    prev.src = modalImg;
    prev.style.display = 'block';
    document.getElementById('upload-hint').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function saveProduct() {
  const name = document.getElementById('m-name').value.trim();
  const desc = document.getElementById('m-desc').value.trim();
  const price = parseFloat(document.getElementById('m-price').value);
  const urlImg = document.getElementById('m-imgurl').value.trim();
  if (!name || isNaN(price)) { toast('Please enter a name and valid price.'); return; }

  // Priority: a freshly uploaded image (data URL) > typed URL > existing modalImg
  let img = '';
  if (modalImg && modalImg.startsWith('data:')) img = modalImg;
  else if (urlImg) img = urlImg;
  else img = modalImg;

  const btn = document.getElementById('m-save');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    if (editingId) {
      await api('/api/products/' + editingId, { method: 'PUT', body: JSON.stringify({ name, desc, price, img }) });
    } else {
      await api('/api/products', { method: 'POST', body: JSON.stringify({ name, desc, price, img }) });
    }
    closeModal();
    await loadProducts();
    toast(editingId ? 'Product updated!' : 'Product added!');
  } catch (e) {
    toast('Save failed: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Save Product';
  }
}

async function removeProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await api('/api/products/' + id, { method: 'DELETE' });
    await loadProducts();
    toast('Product deleted.');
  } catch (e) {
    toast('Delete failed: ' + e.message);
  }
}

// ---------- Contact ----------
async function loadContact() {
  try {
    const c = await api('/api/contact');
    document.getElementById('c-phone').value = c.phone || '';
    document.getElementById('c-email').value = c.email || '';
    document.getElementById('c-addr1').value = c.addr1 || '';
    document.getElementById('c-addr2').value = c.addr2 || '';
    document.getElementById('c-hours').value = c.hours || '';
  } catch (e) {}
}

async function saveContact() {
  const patch = {
    phone: document.getElementById('c-phone').value.trim(),
    email: document.getElementById('c-email').value.trim(),
    addr1: document.getElementById('c-addr1').value.trim(),
    addr2: document.getElementById('c-addr2').value.trim(),
    hours: document.getElementById('c-hours').value.trim()
  };
  try {
    await api('/api/contact', { method: 'PUT', body: JSON.stringify(patch) });
    toast('Contact info saved!');
  } catch (e) {
    toast('Save failed: ' + e.message);
  }
}

// ---------- Orders ----------
async function loadOrders() {
  const list = document.getElementById('orders-list');
  try {
    const orders = await api('/api/orders');
    document.getElementById('stat-orders').textContent = orders.length;
    document.getElementById('stat-revenue').textContent = money(orders.reduce((a, o) => a + (o.total || 0), 0));
    if (!orders.length) {
      list.innerHTML = '<p style="color:#aaa">No orders yet. Orders appear here once customers check out.</p>';
      return;
    }
    list.innerHTML = orders.map(o => `
      <div class="order-row">
        <div class="o-head">
          <span class="o-id">#ORD-${10000 + o.id}</span>
          <span>${money(o.total)}</span>
        </div>
        <div class="o-items">
          <strong>${esc(o.customer)}</strong> · ${esc(o.email)}<br>
          ${esc(o.address || 'No address')}<br>
          ${o.items.map(i => `${esc(i.name)} ×${i.qty}`).join(', ')}<br>
          <span style="color:#aaa;font-size:12px">${new Date(o.created_at).toLocaleString()}</span>
        </div>
      </div>`).join('');
  } catch (e) {
    list.innerHTML = '<p style="color:#e74c3c">Could not load orders.</p>';
  }
}

// ---------- Init: auto-restore session if token still valid ----------
(async function init() {
  const token = localStorage.getItem('glow_token');
  if (!token) return;
  try {
    await api('/api/orders');   // protected probe; succeeds only if token is valid
    showPanel();
  } catch (e) {
    localStorage.removeItem('glow_token');
  }
})();
