# ⚡ ShopSmart Frontend (React 19 + Vite 8)

The client application for **ShopSmart**, built with **React 19**, **Vite 8**, **React Router 7**, and **Recharts**.

---

## 🛠️ Tech Stack & Key Libraries

- **Framework:** [React 19.2.8](https://react.dev/)
- **Build Tool & Bundler:** [Vite 8.2.0](https://vite.dev/)
- **Routing:** [React Router DOM 7.18.3](https://reactrouter.com/)
- **Charts & Data Visualization:** [Recharts 3.10.1](https://recharts.org/) (Radar charts, line charts, bar comparisons)
- **Icons:** [Lucide React 1.39.0](https://lucide.dev/)
- **HTTP Client:** [Axios 1.20.0](https://axios-http.com/)
- **Toast Notifications:** [React Hot Toast 2.6.0](https://react-hot-toast.com/)

---

## 📂 Source Code Structure

```text
frontend/src/
├── api/
│   └── axios.js               # Central Axios client with JWT bearer & refresh interceptors
├── components/
│   ├── Navbar.jsx             # Responsive navigation bar with mobile drawer & theme switcher
│   ├── Footer.jsx             # Application footer & system links
│   ├── PlatformBadge.jsx      # Marketplace badges (Amazon, Flipkart, Tata CLiQ, Meesho, etc.)
│   ├── AnalysisResult.jsx     # AI deal score summary card with quick metrics
│   ├── ErrorBoundary.jsx      # Global React error boundary component
│   └── ProtectedRoute.jsx     # User & Admin route guards (AdminProtectedRoute)
├── context/
│   ├── AuthContext.jsx        # User authentication, token lifecycle, and role state
│   └── ThemeContext.jsx       # Dark / Light theme provider with persistent storage
├── pages/
│   ├── Home.jsx               # Hero analyzer, recent items feed, benefits section
│   ├── AnalysisPage.jsx       # In-depth URL scraping deal breakdown & alternative offers
│   ├── DecisionReport.jsx     # Multi-store decision matrix, radar analysis & price curves
│   ├── Recent.jsx             # 3-column responsive history feed & tab filtering
│   ├── ProductDetail.jsx      # Product specifications, price history, reviews & offers
│   ├── Wishlist.jsx           # Guest session + authenticated user saved watchlist
│   ├── Alerts.jsx             # Target price threshold alerts manager
│   ├── Login.jsx              # Shopper login with glassmorphism eCommerce background
│   ├── Register.jsx           # Shopper account registration
│   ├── Profile.jsx            # Account details & security password change
│   ├── AdminLogin.jsx         # Isolated Admin Portal authentication
│   ├── Admin.jsx              # Admin Dashboard (Live Telemetry Log, User Roles, Products)
│   ├── ForgotPassword.jsx     # Email tokenized password recovery flow
│   └── NotFound.jsx           # Custom 404 page
├── utils/
│   ├── images.js              # Fallback product images & broken link handlers
│   └── platforms.js           # Platform theme colors & brand mappings
├── App.jsx                    # Root router with global Toast container
├── App.css                    # Unified design tokens, CSS variables, and responsive layout
└── main.jsx                   # React 19 root bootstrap
```

---

## 🚀 Available Scripts

### `npm run dev`
Starts the local Vite development server with Hot Module Replacement (HMR).
```bash
npm run dev
# Running at: http://localhost:5173
```

### `npm run build`
Compiles the React application into optimized static assets in the `dist/` directory.
```bash
npm run build
```

### `npm run lint`
Runs ESLint across the codebase using the React 19 ruleset.
```bash
npm run lint
```

### `npm run preview`
Locally previews the production build created in `dist/`.
```bash
npm run preview
```

---

## ⚙️ Environment Variables

Create `.env.development` or `.env.production` in the `frontend` root:

```ini
# Backend API Base URL
VITE_API_URL=http://127.0.0.1:8000/api
```

---

## 🎨 Design System & Theming

- **Theme Switching:** Dark mode (`dark`) and light mode (`light`) toggled globally through `ThemeContext`.
- **CSS Variables:** Colors, borders, surfaces, and shadows are defined dynamically via CSS custom properties in `src/App.css`.
- **WCAG High Contrast:** Ensures prices, discounts, radar charts, and decision matrices are completely legible in both light and dark backgrounds.
