# Rush Hours ⏱️🍔

A two-sided campus canteen pre-order system built for college campuses. It allows students to skip peak-hour rush by ordering and paying ahead via Razorpay, while canteen staff can manage incoming queues, update live item availability, and securely verify pickups using QR codes or 4-digit OTPs.

Developed by **Sathappan** & **Hariharan**.

---

## 🏛️ Monorepo Architecture

This repository is organized as an **npm workspaces** monorepo with three core sub-packages:

```
rush-hours/
├── student-app/          # Mobile-first web app for students (React + Vite + Tailwind)
│   ├── src/
│   │   ├── App.jsx       # Student UI scaffold (canteen menu, order status, QR/OTP modal)
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js    # Runs on port 5173
│   └── tailwind.config.js
│
├── canteen-portal/       # Web dashboard for canteen staff (React + Vite + Tailwind)
│   ├── src/
│   │   ├── App.jsx       # Staff UI scaffold (live queue, stock control, QR/OTP verification)
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js    # Runs on port 5174
│   └── tailwind.config.js
│
├── server/               # Node.js + Express backend with PostgreSQL & Razorpay
│   ├── src/
│   │   ├── config/       # Environment configuration
│   │   ├── db/           # PostgreSQL connection pool (pg)
│   │   ├── routes/       # API Route modules
│   │   │   ├── auth.routes.js     # Student & staff auth endpoints
│   │   │   ├── canteen.routes.js  # Canteen menus & stock updates
│   │   │   ├── orders.routes.js   # Order placement & queue tracking
│   │   │   ├── payments.routes.js # Razorpay order creation & webhooks
│   │   │   └── pickup.routes.js   # QR & OTP token issuance & verification
│   │   └── index.js      # Express server entry point (port 5000)
│   └── package.json
│
├── .env.example          # Consolidated environment variable template
├── package.json          # Monorepo root config with workspaces & scripts
└── README.md             # Project documentation & local setup instructions
```

---

## 🚀 Port Allocation

| Component | Technology | Default Local URL | Description |
| :--- | :--- | :--- | :--- |
| **`server`** | Node.js / Express | `http://localhost:5000` | Shared REST API & Webhooks |
| **`student-app`** | React + Vite + Tailwind | `http://localhost:5173` | Mobile-first Student Ordering Web App |
| **`canteen-portal`**| React + Vite + Tailwind | `http://localhost:5174` | Staff Counter Management Dashboard |

---

## 🛠️ Prerequisites

Before getting started, make sure you have installed:
1. **Node.js**: v18.0.0 or higher
2. **npm**: v9.0.0 or higher (supports npm workspaces)
3. **PostgreSQL**: v14 or higher running locally or hosted (e.g. Supabase, Neon)

---

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/tsathappan2007/rush-hours.git
cd rush-hours
```

### 2. Install all dependencies
Because this is configured with npm workspaces, running `npm install` at the repository root will install dependencies for all 3 sub-packages concurrently:
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Configure your environment variables:
- **`DATABASE_URL`**: Your local PostgreSQL connection string (e.g. `postgresql://postgres:postgres@localhost:5432/rush_hours_db`).
- **`JWT_SECRET`**: A secret key for JWT session signing.
- **`RAZORPAY_KEY_ID`** & **`RAZORPAY_KEY_SECRET`**: Your test credentials from the [Razorpay Dashboard](https://dashboard.razorpay.com/).

---

## 🏃 Running Locally

### Option A: Run all three parts concurrently (Recommended)
From the root directory, run:
```bash
npm run dev
```
This runs the Express API server, Student App, and Canteen Portal simultaneously in a single terminal with colored prefixes (`[SERVER]`, `[STUDENT]`, `[CANTEEN]`).

### Option B: Run parts individually
You can also run any specific component individually from the root directory:

- **Run only Backend Server:**
  ```bash
  npm run dev:server
  ```
- **Run only Student Web App:**
  ```bash
  npm run dev:student
  ```
- **Run only Canteen Staff Portal:**
  ```bash
  npm run dev:canteen
  ```

Alternatively, you can `cd` into any subfolder and run `npm run dev` directly.

---

## 🧪 Verifying the Setup

Once running, verify each part:
- **Backend API Health Check**: Visit `http://localhost:5000/health` (should return JSON `{ "status": "ok", ... }`).
- **Student App**: Open `http://localhost:5173` on desktop or in mobile responsive mode.
- **Canteen Portal**: Open `http://localhost:5174` to view the canteen dashboard.

---

## 📌 Development Roadmap

- [x] Monorepo structure scaffolding with npm workspaces
- [x] Route outlines for auth, canteen menus, orders, payments, and pickup
- [x] Mobile-first UI scaffold for `student-app`
- [x] Staff UI scaffold for `canteen-portal`
- [ ] PostgreSQL database schema & migrations (users, canteens, items, orders)
- [ ] JWT authentication (student roll no. / email & canteen staff credentials)
- [ ] Razorpay order creation and webhook signature validation
- [ ] Real-time queue updates (WebSockets / SSE)
- [ ] Pickup QR code generation & staff camera scanner integration
