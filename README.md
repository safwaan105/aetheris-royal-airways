# Aetheris Royal Airways

Luxury full-stack flight booking platform with live flight search, KYC checks, Stripe checkout, and booking notifications.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + Framer Motion + React Three Fiber
- SQLite + Prisma
- Stripe Checkout + Webhooks
- Amadeus Flight Offers API (live GDS search)
- Nodemailer (email) + Twilio (SMS)

## Implemented Features

- Royal dark UI with glassmorphism and neomorphism
- 3D hero scene
- Secure auth (JWT in HTTP-only cookie)
- Route middleware guards for `/admin`, `/my-bookings`, `/checkout/*`
- Admin flight creation dashboard
- Search/booking flow with seat class and dynamic pricing
- Persistent seat inventory per flight with seat locking (race-safe checks)
- Real-time live flight search toggle (Amadeus)
- KYC checks before checkout
- Stripe payment flow:
  - `/api/payments/checkout`
  - `/api/payments/confirm`
  - `/api/payments/webhook`
- PNR generation
- Email/SMS booking notifications
- My Bookings history with KYC/payment visibility

## Setup

1. Install deps:

```bash
npm install
```

2. Copy environment file:

```bash
copy .env.example .env.local
```

3. Fill in `.env.local`:
- Required: `DATABASE_URL`, `JWT_SECRET`
- Optional but recommended:
  - Stripe keys for real payments
  - Amadeus keys for live GDS search
  - SMTP and Twilio creds for notifications
  - KYC provider URL/key for external KYC

4. Run app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.
6. Seed initial flights and seat inventory (first run):

```bash
curl -X POST http://localhost:3000/api/seed
```

7. Check backend health:

```bash
curl http://localhost:3000/api/health
```

## Stripe Webhook Local Test

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Set emitted secret to `STRIPE_WEBHOOK_SECRET`.

## API Summary

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/flights` (supports `live=1&from=...&to=...&date=...`)
- `GET /api/flights/status`
- `POST /api/admin/flights` (admin only)
- `GET /api/bookings` (auth)
- `POST /api/bookings` (direct simulated booking)
- `POST /api/payments/checkout` (auth)
- `POST /api/payments/confirm` (auth)
- `POST /api/payments/webhook` (Stripe)
- `POST /api/seed`

## Notes

- First signed-up account is assigned `admin`.
- If Stripe is not configured, checkout automatically falls back to simulated payment confirmation.
- If Amadeus credentials are missing, live search falls back to internal inventory.
