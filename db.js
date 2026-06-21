/**
 * db.js — simple, dependency-free JSON datastore.
 * All product / contact / order data lives in data/db.json and is shared by
 * every visitor, so admin changes show up on the storefront for everyone.
 *
 * NOTE for Railway: the container filesystem is ephemeral and resets on each
 * redeploy. To keep data across deploys, mount a Railway Volume and point
 * DATA_DIR at it (e.g. DATA_DIR=/data). Swapping this file for SQLite/Postgres
 * later only means rewriting the functions below — the API stays the same.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function placeholder(name) {
  return `https://via.placeholder.com/600x450?text=${encodeURIComponent(name || 'Product')}`;
}

const SEED_PRODUCTS = [
  { name: "Vitamin C Serum",      desc: "Brightens skin, reduces dark spots, and gives a healthy glow.",          price: 24.99, img: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&h=450&fit=crop" },
  { name: "Hydrating Face Cream", desc: "Deep moisturizing cream suitable for all skin types.",                   price: 19.99, img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=450&fit=crop" },
  { name: "Aloe Vera Gel",        desc: "Soothes irritated skin and provides long-lasting hydration.",            price: 12.99, img: "https://images.unsplash.com/photo-1618939304347-e91b1f33d2ab?w=600&h=450&fit=crop" },
  { name: "Rose Face Toner",      desc: "Refreshes skin and minimizes pores for a smooth finish.",                price: 14.99, img: "https://images.unsplash.com/photo-1631390077498-f18dbb09f30e?w=600&h=450&fit=crop" },
  { name: "Matte Lipstick",       desc: "Long-lasting rich color with a smooth matte finish.",                    price: 9.99,  img: "https://images.unsplash.com/photo-1586495777744-4e6232bf2889?w=600&h=450&fit=crop" },
  { name: "Charcoal Face Wash",   desc: "Removes dirt and excess oil for fresh and clean skin.",                  price: 11.99, img: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=450&fit=crop" },
  { name: "Hair Repair Shampoo",  desc: "Nourishes damaged hair and restores natural shine.",                     price: 18.99, img: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=600&h=450&fit=crop" },
  { name: "Silky Body Lotion",    desc: "Keeps your skin soft, smooth, and hydrated all day.",                    price: 16.99, img: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=450&fit=crop" },
  { name: "Sunscreen SPF 50",     desc: "Protects your skin from harmful UVA and UVB rays.",                      price: 21.99, img: "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=600&h=450&fit=crop" },
  { name: "Night Repair Cream",   desc: "Repairs and rejuvenates skin while you sleep.",                          price: 26.99, img: "https://images.unsplash.com/photo-1583241800698-e8ab01830a58?w=600&h=450&fit=crop" }
];

const SEED_CONTACT = {
  storeName: "Glow Beauty Store",
  phone: "(606) 980-0000",
  email: "support@glowbeautystore.com",
  addr1: "606 Glow Beauty Blvd, Suite 100",
  addr2: "Leesburg, VA 20175",
  hours: "Mon–Fri 9am–6pm EST"
};

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const init = {
      products: SEED_PRODUCTS.map((p, i) => ({ id: i + 1, ...p })),
      contact: { ...SEED_CONTACT },
      orders: [],
      nextProductId: SEED_PRODUCTS.length + 1,
      nextOrderId: 1
    };
    write(init);
  }
}

function read() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('DB read error, reseeding:', e.message);
    fs.unlinkSync(DB_FILE);
    ensure();
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
}

function write(db) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE); // atomic-ish swap so a crash can't leave half a file
}

// ---- Products ----
function getProducts() { return read().products; }

function getProduct(id) { return read().products.find(p => p.id === Number(id)) || null; }

function addProduct({ name, desc, price, img }) {
  const db = read();
  const product = {
    id: db.nextProductId++,
    name: String(name).trim(),
    desc: (desc || '').trim(),
    price: Number(price),
    img: (img && String(img).trim()) || placeholder(name)
  };
  db.products.push(product);
  write(db);
  return product;
}

function updateProduct(id, { name, desc, price, img }) {
  const db = read();
  const p = db.products.find(x => x.id === Number(id));
  if (!p) return null;
  if (name !== undefined) p.name = String(name).trim();
  if (desc !== undefined) p.desc = String(desc).trim();
  if (price !== undefined && !isNaN(Number(price))) p.price = Number(price);
  if (img !== undefined && img) p.img = String(img).trim();
  write(db);
  return p;
}

function deleteProduct(id) {
  const db = read();
  const before = db.products.length;
  db.products = db.products.filter(x => x.id !== Number(id));
  write(db);
  return db.products.length < before;
}

// ---- Contact ----
function getContact() { return read().contact; }

function setContact(patch) {
  const db = read();
  db.contact = { ...db.contact, ...patch };
  write(db);
  return db.contact;
}

// ---- Orders ----
function getOrders() { return read().orders.slice().reverse(); } // newest first

function addOrder({ customer, email, address, items, total }) {
  const db = read();
  const order = {
    id: db.nextOrderId++,
    customer: customer || 'Guest',
    email: email || '',
    address: address || '',
    items: items || [],
    total: Number(total) || 0,
    created_at: new Date().toISOString()
  };
  db.orders.push(order);
  write(db);
  return order;
}

module.exports = {
  getProducts, getProduct, addProduct, updateProduct, deleteProduct,
  getContact, setContact,
  getOrders, addOrder
};
