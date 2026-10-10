# MOVI Clothing Co. — Web Application

A streetwear e-commerce web application built with **React 19**, **Vite 8**, **Tailwind CSS v4**, and **React Router v7**.

---

## 💻 1. Running on Your Computer (Locally)

### Prerequisites
- **Node.js** (v18+ or v20+ recommended, currently verified on Node v24)
- **npm** (included with Node.js)

### Quick Start

1. **Install dependencies** (already installed in this repository):
   ```bash
   npm install
   ```

2. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:9090` (or the port shown in your terminal).
   *Hot-module reloading (HMR) is active, so code edits update instantly.*

3. **Run a production build preview locally**:
   ```bash
   npm run build
   npm run preview
   ```
   This compiles the optimized production bundle into `dist/` and serves it locally.

---

## 🚀 2. Running in Production

### Option A: Deploy to Vercel (Recommended — 1 Click)
This project includes pre-configured `vercel.json` with SPA routing rewrites and asset caching.
1. Push this repository to GitHub / GitLab / Bitbucket.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Vercel will automatically detect Vite:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Click **Deploy**.

---

### Option B: Deploy to Netlify
This project includes `public/_redirects` which handles client-side routing automatically:
1. Connect your repository on [netlify.com](https://netlify.com).
2. Set:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Click **Deploy Site**.

---

### Option C: Deploy with Docker (AWS, GCP Cloud Run, DigitalOcean, VPS)
A multi-stage production `Dockerfile` and `nginx.conf` are already provided:

1. **Build the Docker container image**:
   ```bash
   docker build -t movi-clothing:latest .
   ```

2. **Run the container**:
   ```bash
   docker run -d -p 80:80 --name movi movi-clothing:latest
   ```

3. Open `http://localhost` (or your server's public IP).

---

### Option D: Traditional Web Server (Nginx / Apache / Static Host)
1. Run:
   ```bash
   npm run build
   ```
2. Upload the contents of the `dist/` directory to your web server root (`/var/www/html` or similar).
3. Ensure your web server redirects all non-file requests to `/index.html` (sample `nginx.conf` is included).

---

## 📁 Key Routes & Pages

- `/` — Homepage / Fall–Winter 2026 Collection Hero & Lookbook
- `/shop` — Full Product Catalog
- `/t-shirts` — T-Shirts Category
- `/hoodies` — Hoodies Category
- `/product/:code` — Product Detail View (e.g. `/product/01`)
- `/search` — Live Product Search
- `/bag` — Shopping Cart & Quantity Manager
- `/checkout` — Checkout & Order Confirmation
- `/login` — Member Authentication (Sign in / Register)
- `/account` — Customer Profile & Order History
- `/admin` — Store Control Panel & Real-time Metrics
- `/story`, `/lookbook`, `/contact`, `/shipping`, `/returns`, `/faq` — Brand Editorial Pages
