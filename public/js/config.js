/* config.js — edit this ONE value if your frontend and backend are on different hosts.
 *
 *  SAME-ORIGIN (recommended): backend serves the frontend too (single Railway/Node service).
 *  Leave this as an empty string. Requests go to /api/... on the same origin.
 *
 *  SPLIT HOSTING: frontend on Vercel/Netlify, backend on Railway.
 *  Set this to your backend's full URL, e.g.:
 *      window.GLOW_API_BASE = "https://your-app.up.railway.app";
 *  (no trailing slash). The backend already sends CORS headers to allow this.
 */
window.GLOW_API_BASE = "";
