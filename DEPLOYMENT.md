# Deployment Guide

## 1. SQLite + Prisma Setup

1. Set `DATABASE_URL` in environment variables.
2. For local/dev, use:
   - `DATABASE_URL="file:./prisma/dev.db"`
3. Generate Prisma client:
   - `npx prisma generate`
4. Create/update schema in database:
   - `npx prisma db push`

## 2. Vercel Deployment

1. Push this repo to GitHub.
2. Import repo in Vercel.
3. Framework preset should auto-detect Next.js.
4. Add all environment variables from `.env.example`.
5. Deploy.

Note: Vercel serverless filesystem is ephemeral. For persistent production data, switch Prisma datasource to a hosted database (for example PostgreSQL) before production go-live.

## 3. Stripe Setup

1. In Stripe Dashboard, create API keys and set:
   - `STRIPE_SECRET_KEY`
2. Create webhook endpoint:
   - URL: `https://<your-domain>/api/payments/webhook`
   - Events: `checkout.session.completed`
3. Copy webhook secret to:
   - `STRIPE_WEBHOOK_SECRET`

## 4. Amadeus Setup (Optional but recommended)

1. Create account at Amadeus for Developers.
2. Use test API credentials:
   - `AMADEUS_CLIENT_ID`
   - `AMADEUS_CLIENT_SECRET`
3. Live search toggle in UI will call Amadeus when credentials exist.

## 5. Email + SMS Notifications

Set SMTP:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `NOTIFICATION_FROM_EMAIL`

Set Twilio:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

## 6. Post-Deploy Initialization

1. Create first admin account on `/auth`.
2. Seed demo data once:
   - `POST https://<your-domain>/api/seed`
3. Confirm flights load on homepage.

## 7. Production Checks

1. Complete one Stripe checkout and verify booking appears in `/my-bookings`.
2. Confirm webhook calls are successful in Stripe logs.
3. Confirm email/SMS are delivered.
4. Test admin add-flight and verify seat inventory is generated.
