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
- **`RAZORPAY_WEBHOOK_SECRET`**: A secret string of your choice used to sign and verify incoming webhook requests.

---

## 💳 Razorpay Test Mode Setup

Rush Hours supports full end-to-end Razorpay integration with server-side webhook order confirmation, atomic stock decrements, and automatic refunds on stock collisions or payment timeouts.

### 1. Getting Razorpay Test API Keys
1. Sign up or log in at [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. On the top/left navigation, toggle the switch from **Live Mode** to **Test Mode**.
3. Go to **Settings** $\rightarrow$ **API Keys**.
4. Click **Generate Test Key**.
5. Copy the **Key ID** (`rzp_test_...`) and **Key Secret** into your `.env` file:
   ```env
   RAZORPAY_KEY_ID=rzp_test_your_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   RAZORPAY_WEBHOOK_SECRET=my_local_webhook_secret_123
   ```
6. Also set the public key for the student frontend in `.env`:
   ```env
   VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
   ```

*(Note: If you run without keys, Rush Hours automatically activates **Mock Test Mode**, generating test orders and mock refunds so your local development workflow never breaks).*

---

## 📡 Simulating Razorpay Webhooks Locally

In production, Razorpay sends an HTTP `POST` to `/api/payments/webhook` with an `x-razorpay-signature` header computed via HMAC-SHA256. For local testing, you can simulate verified webhooks in two ways:

### Option A: Using the built-in simulation script (Fastest)
Ensure the server is running (`npm run dev:server`), then run from `server/` or the root:

```bash
# In server/ directory:
npm run webhook:simulate <order_id> <payment_id> <event>

# Example - Confirm a sample order:
npm run webhook:simulate order_sample_rzp_12345 pay_test_777 payment.captured
```
This script computes the valid HMAC-SHA256 signature using your `RAZORPAY_WEBHOOK_SECRET` and sends the webhook payload to `http://localhost:5000/api/payments/webhook`.

### Option B: Using `curl` with manual HMAC signature
1. Compute the HMAC-SHA256 digest of your JSON payload using your webhook secret.
2. Send the request:
```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: <computed_hmac_sha256_hex>" \
  -d '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123","order_id":"order_sample_rzp_12345","amount":10000}}}}'
```

### Option C: Using Razorpay Webhook Dashboard + ngrok / localtunnel
To receive live events from the Razorpay Test Dashboard on your localhost:
```bash
npx localtunnel --port 5000
```
Add the public URL (e.g. `https://your-tunnel.loca.lt/api/payments/webhook`) under **Razorpay Dashboard $\rightarrow$ Settings $\rightarrow$ Webhooks**, subscribe to `payment.captured` and `payment.failed`, and copy the webhook secret to `.env`.

---

## 🔄 Payment & Order Lifecycle Flow

```
[Student Checkout]
       │
       ▼
1. POST /api/payments/checkout
   • Calculates verified amount from DB prices (₹ to paise)
   • Calls Razorpay Orders API: orders.create(...)
   • Creates Order in DB with status "PENDING_PAYMENT"
   • Note: Stock is NOT decremented yet
       │
       ▼
2. Student completes payment in Razorpay Checkout Modal
       │
       ▼
3. Razorpay triggers Webhook: POST /api/payments/webhook
   • Server validates cryptographic HMAC-SHA256 signature
   • Runs Atomic Database Transaction:
     ├── Decrements stock atomically (WHERE quantity >= order_quantity)
     ├── Moves order status from PENDING_PAYMENT to CONFIRMED
     └── Issues PickupToken with 4-digit OTP & dynamic QR payload
       │
       ├── [If Stock Exhausted during checkout race]
       │   └── Automatically triggers refund via Razorpay API & marks order REFUNDED
       │
       └── [If Payment Failed / Timed out]
           └── Automatically marks order FORFEITED and refunds any captured funds
```

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

## 🧪 Running Tests

Run the test suite (concurrency race-condition tests, Razorpay payment flows, and state machine enforcement):
```bash
npm test --workspace=server
```

---

## 📌 Development Roadmap

- [x] Monorepo structure scaffolding with npm workspaces
- [x] Route outlines for auth, canteen menus, orders, payments, and pickup
- [x] Mobile-first UI scaffold for `student-app`
- [x] Staff UI scaffold for `canteen-portal`
- [x] PostgreSQL database schema & migrations (Prisma ORM)
- [x] Canteen & order REST APIs with atomic stock transactions
- [x] Strict linear order state machine enforcement
- [x] Razorpay order checkout session creation
- [x] Cryptographic Razorpay webhook handler with atomic stock decrement
- [x] Auto-refund trigger on stock depletion and unconfirmed order timeouts
- [x] Test suite: concurrency race conditions & payment flows
- [ ] Student roll no. / email auth & canteen staff session authentication
- [ ] Real-time queue updates (WebSockets / SSE)
- [ ] In-app pickup QR code display & staff camera barcode scanner integration
