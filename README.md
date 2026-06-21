# Glow Beauty Store — Full-Stack E-commerce

Express backend + JSON datastore + static frontend. Admin changes are saved
server-side, so they appear on the storefront for **every** visitor on any device.

## Run locally
```bash
npm install
npm start
# http://localhost:3000        storefront
# http://localhost:3000/admin.html   admin  (admin / admin123)
```

## Structure
```
server.js            Express API + static server
db.js                JSON datastore (swap for SQLite/Postgres later)
data/db.json         created on first run (seed data)
public/
  index.html         storefront (shop, contact, policies, checkout)
  product.html       product detail page
  admin.html         admin panel
  css/style.css      shared styles
  js/common.js       API wrapper, cart, toast
  js/store.js        storefront logic
  js/product.js      product page logic
  js/admin.js        admin logic
```

## API
| Method | Path                | Auth | Purpose                |
|--------|---------------------|------|------------------------|
| POST   | /api/login          | –    | get admin token        |
| GET    | /api/products       | –    | list products          |
| GET    | /api/products/:id   | –    | single product         |
| POST   | /api/products       | ✓    | create                 |
| PUT    | /api/products/:id   | ✓    | update                 |
| DELETE | /api/products/:id   | ✓    | delete                 |
| GET    | /api/contact        | –    | contact info           |
| PUT    | /api/contact        | ✓    | update contact info    |
| GET    | /api/orders         | ✓    | list orders            |
| POST   | /api/orders         | –    | place an order         |

## Deploy (Railway)
1. Push this folder to GitHub, create a Railway service from the repo.
2. Railway runs `npm install` then `npm start` automatically.
3. Set env vars (optional): `ADMIN_USER`, `ADMIN_PASS`.
4. **Persist data across redeploys:** add a Railway Volume mounted at `/data`
   and set `DATA_DIR=/data`. Without a volume, the filesystem resets each deploy.

## Notes
- Cart lives in the browser (localStorage) — correct for a per-visitor cart.
- Products / contact / orders live on the server — shared by everyone.
- Stripe is represented by the compliant checkout UI; wire real Stripe keys
  into `placeOrder()` / a server `/api/checkout` route when you go live.
