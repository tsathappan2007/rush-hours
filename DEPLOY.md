# Rush Hours — Production Deployment Guide & Checklist

This guide provides operational instructions for deploying the Rush Hours monorepo (`server/`, `student-app/`, and `canteen-portal/`), executing database migrations in production, configuring environment variables, and completing the Razorpay Live-Mode onboarding and Route payout setup.

---

## 1. System Architecture & Topology

Rush Hours runs as three decoupled services:
- **`server/`**: Node.js + Express backend running Prisma ORM connected to managed PostgreSQL (e.g. AWS RDS, Supabase, Neon, or Railway).
- **`student-app/`**: Mobile-first React Single-Page Application (SPA) deployed to a static edge CDN (e.g. Vercel, Cloudflare Pages, AWS S3 + CloudFront).
- **`canteen-portal/`**: Kitchen dashboard React SPA deployed to a static edge CDN (Vercel, Netlify, or Cloudflare Pages) with offline local cache resilience.

---

## 2. Production Environment Variables Reference

| Variable | Target | Description | Example (Production) |
| :--- | :--- | :--- | :--- |
| `PORT` | `server/` | Port the backend listens on | `5000` or assigned by PaaS ($PORT) |
| `NODE_ENV` | `server/` | Environment flag | `production` |
| `DATABASE_URL` | `server/` | PostgreSQL connection string | `postgresql://usr:pwd@ep-xyz.aws.neon.tech/rush_hours?sslmode=require` |
| `CLIENT_STUDENT_URL` | `server/` | CORS allowed origin for student app | `https://orders.college.edu` |
| `CLIENT_CANTEEN_URL` | `server/` | CORS allowed origin for staff portal | `https://staff.college.edu` |
| `JWT_SECRET` | `server/` | High-entropy random key for JWT signing | `openssl rand -base64 64` |
| `JWT_EXPIRES_IN` | `server/` | Expiration lifetime for session tokens | `7d` |
| `ALLOWED_STUDENT_DOMAIN` | `server/` | College domain whitelist for students | `@college.edu` |
| `RAZORPAY_KEY_ID` | `server/` | Razorpay Live Key ID | `rzp_live_abc1234567890` |
| `RAZORPAY_KEY_SECRET`| `server/` | Razorpay Live Key Secret | `LiveSecretKeyFromDashboard` |
| `RAZORPAY_WEBHOOK_SECRET`| `server/` | Webhook verification secret | `whsec_9876543210zyx` |
| `VITE_API_BASE_URL` | Frontends | Public URL to backend API | `https://api.college.edu/api` |
| `VITE_RAZORPAY_KEY_ID`| `student-app` | Public Razorpay Key ID for Checkout | `rzp_live_abc1234567890` |

---

## 3. Database Migration on Deploy Pipeline

Never use `prisma migrate dev` in production environments because it attempts to create new migrations interactively. Use `prisma migrate deploy`, which applies pending SQL migrations safely.

### Deployment Script & Pipeline Command
In your CI/CD runner (GitHub Actions, Render build command, or Dockerfile entrypoint):

```bash
# 1. Install dependencies
npm ci

# 2. Generate Prisma Client bindings
npm run db:generate --workspace=server

# 3. Apply pending migrations to PostgreSQL database
npm run db:migrate:deploy --workspace=server

# 4. (Optional - First time setup only) Seed default canteens & menus
# npm run db:seed --workspace=server

# 5. Start the production server
npm run start --workspace=server
```

> **Note on Zero-Downtime Migrations**: All migrations in `server/prisma/migrations/` add nullable columns or new tables with default values, ensuring existing API pods continue handling traffic without disruption during database updates.

---

## 4. Frontend Production Build & Deployment

### Student Web App (`student-app/`)
```bash
cd student-app
npm ci
npm run build
# Dist output: student-app/dist/
```
Deploy `student-app/dist/` to your static host. Configure SPA rewrite rules so all deep links route to `/index.html`:
```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Canteen Staff Portal (`canteen-portal/`)
```bash
cd canteen-portal
npm ci
npm run build
# Dist output: canteen-portal/dist/
```
Deploy `canteen-portal/dist/`. The portal includes:
- **Offline Local Cache**: Automatically caches order lists in browser `localStorage`.
- **Sync Queue**: In the event of Wi-Fi flickers or drops in the kitchen, staff status transitions (`PREPARING`, `READY`, etc.) queue locally and sync automatically when the connection is re-established.

---

## 5. Razorpay Live-Mode Checklist

Before switching from `rzp_test_...` to `rzp_live_...`:

### Phase 1: Business KYC & Bank Verification
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Submit College / Institution registration documents:
   - Certificate of Incorporation / Trust Deed / Society Registration.
   - Authorized signatory PAN, Aadhaar, and Board Resolution.
   - Bank Account verification: Cancelled cheque or bank statement with IFSC and Account Number.
3. Complete Video KYC / Digital verification. Once approved, the dashboard switches from "Test" to "Live" access.

### Phase 2: Generating Live API Keys & Webhook Configuration
1. Go to **Settings → API Keys** and click **Generate Live Key**.
2. Securely store `Key ID` (`rzp_live_...`) and `Key Secret` in your production secrets manager.
3. Configure Webhook Endpoint:
   - URL: `https://api.college.edu/api/payments/webhook`
   - Secret: Set a cryptographically secure string and mirror it in `RAZORPAY_WEBHOOK_SECRET`.
   - Active Events to Subscribe:
     - `payment.captured`
     - `payment.failed`
     - `refund.processed`

### Phase 3: Razorpay Route Setup (Vendor & Canteen Payouts)
Since Rush Hours powers multiple independent canteens (e.g. Main Food Court, North Block Cafe), student payments can be automatically split and routed to each canteen vendor's bank account:

1. **Activate Razorpay Route**:
   - In Razorpay Dashboard, activate **Route** under Products.
2. **Create Linked Accounts for Canteen Vendors**:
   - Each canteen vendor submits their GSTIN, PAN, and settlement bank account.
   - Create a linked account via the Route API or Dashboard for each canteen:
     ```javascript
     const account = await razorpay.accounts.create({
       type: 'route',
       name: 'Main Food Court Vendor Ltd',
       email: 'accounts.mainfc@college.edu',
       tnc_accepted: true,
       account_details: {
         business_name: 'Main Food Court Catering',
         business_type: 'private_limited'
       },
       bank_account: {
         ifsc_code: 'HDFC0001234',
         account_number: '50100234567890',
         beneficiary_name: 'Main Food Court Catering'
       }
     });
     ```
   - Store the generated `acc_xxxxxx` ID in the `canteens` table.
3. **Automated Transfer / Split on Order Confirmation**:
   - When creating or capturing the Razorpay order, attach Route transfer specifications:
     ```javascript
     transfers: [
       {
         account: canteen.razorpayAccountId, // e.g. "acc_MainFC123"
         amount: totalAmountInPaise - platformFeeInPaise,
         currency: 'INR',
         on_hold: 0 // Direct instant settlement on payout cycle
       }
     ]
     ```
4. **Platform Fee / Commission**:
   - The college platform retains the fee (e.g. 2%) while the remaining 98% settles directly into the canteen vendor's account on T+1 banking days.
5. **Refund Handling**:
   - In `services/razorpay.service.js`, the refund API is configured with `reverse_all: 1` so that if an order is cancelled during the 2-minute grace window, funds are reversed from the vendor's linked account back to the student.

---

## 6. Pre-Launch Sanity Verification Runbook

1. **Health Check**:
   ```bash
   curl -i https://api.college.edu/health
   # Response: {"status":"ok","service":"rush-hours-server", ...}
   ```
2. **Student Login**: Verify that only `@college.edu` emails are accepted.
3. **Staff Canteen Guard**: Verify that staff credentials only grant access to their assigned canteen code.
4. **Webhook Simulation**:
   ```bash
   npm run webhook:simulate --workspace=server
   ```
5. **Kitchen Offline Simulation**:
   - In `canteen-portal`, click the `Online / Offline` toggle.
   - Change an order status to verify it queues locally.
   - Toggle back to `Online` and verify the queue empties and synchronizes.
