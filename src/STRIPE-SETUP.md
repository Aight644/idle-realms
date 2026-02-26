# Stripe + Firebase Cloud Functions Setup Guide

## Prerequisites
- Node.js 18+ installed
- Firebase CLI: `npm install -g firebase-tools`
- Your Stripe account with products created

## Step 1: Install Firebase CLI & Login

```bash
npm install -g firebase-tools
firebase login
```

## Step 2: Initialize Firebase in your project

```bash
cd C:\Users\hamza\Downloads\idle-realms-deploy\idle-realms
firebase init functions
```

When prompted:
- Select your project: `idle-realms-25503`
- Language: **JavaScript**
- ESLint: No
- Install dependencies: Yes
- **IMPORTANT**: If it asks to overwrite `functions/index.js`, say **NO** — we already have it

## Step 3: Set Stripe Secrets in Firebase Config

```bash
firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY_HERE."
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
```

(You'll get the webhook secret in Step 6)

## Step 4: Install function dependencies

```bash
cd functions
npm install
cd ..
```

## Step 5: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

After deploying, you'll get URLs like:
```
✓ Function createCheckoutSession: https://us-central1-idle-realms-25503.cloudfunctions.net/createCheckoutSession
✓ Function stripeWebhook: https://us-central1-idle-realms-25503.cloudfunctions.net/stripeWebhook
✓ Function checkPurchases: https://us-central1-idle-realms-25503.cloudfunctions.net/checkPurchases
```

## Step 6: Set up Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://us-central1-idle-realms-25503.cloudfunctions.net/stripeWebhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. Click **"Reveal"** on the Signing secret → copy it (starts with `whsec_`)
7. Set it in Firebase:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET_HERE"
   firebase deploy --only functions
   ```

## Step 7: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## Step 8: Add Environment Variables to Vercel

Go to Vercel → Settings → Environment Variables and add:

| Name | Value |
|------|-------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_51T4uowQZjXMzndTIQsdtKUWJlu8wu31BsTfEpWEU5wMh2E6co73q4zkuyJjX3Zb3ROm58kHrkLBCg521k5x8nfi900xGkrlMbI` |
| `VITE_FUNCTIONS_URL` | `https://us-central1-idle-realms-25503.cloudfunctions.net` |

Then **Redeploy** (uncheck "Use existing Build Cache").

## Step 9: Update Gold Rush Price ID

Once you have the new USD Price ID for Gold Rush, update it in:
- `functions/index.js` → `PRICE_MAP` → replace `"GOLD_RUSH_PRICE_ID"`
- `src/App.jsx` → `STRIPE_PRICES` → replace `"GOLD_RUSH_PRICE_ID"`

Then redeploy both:
```bash
firebase deploy --only functions
git add -A && git commit -m "fix gold rush price" && git push
```

## Testing

1. Use test card: `4242 4242 4242 4242`, any future date, any CVC
2. Click the 💳 button on any store item
3. Complete checkout on Stripe's page
4. You'll be redirected back, and the purchase should be granted within seconds

## Going Live

When ready for real payments:
1. Switch Stripe to live mode
2. Create new products/prices in live mode
3. Update all Price IDs in `functions/index.js` and `src/App.jsx`
4. Update keys:
   ```bash
   firebase functions:config:set stripe.secret_key="sk_live_..."
   firebase functions:config:set stripe.webhook_secret="whsec_live_..."
   ```
5. Update Vercel env var `VITE_STRIPE_PUBLISHABLE_KEY` to `pk_live_...`
6. Create a new webhook endpoint for live mode
7. Redeploy everything
