# Vercel Deployment Guide - Safar Sathi

Deploy Safar Sathi to Vercel for production hosting.

## Prerequisites

- GitHub account with repository pushed
- Vercel account ([vercel.com](https://vercel.com))
- Firebase project configured (see FIREBASE_SETUP.md)
- Razorpay account (for payments)

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial Safar Sathi platform"
git push origin main
```

## Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework Preset: **Next.js**
4. Root Directory: `safar-sathi` (if monorepo) or `.` if repo root is the app

## Step 3: Environment Variables

Add all variables from `.env.example` in Vercel Project Settings → Environment Variables:

### Required for Production

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
NEXT_PUBLIC_APP_URL=https://www.thesafarsathi.com
DEMO_MODE=false
```

### Optional (enable features)

```
OPENAI_API_KEY
GEMINI_API_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID
EMAIL_API_URL
EMAIL_API_KEY
WHATSAPP_WEBHOOK_URL
```

## Step 4: Deploy

Click **Deploy**. Vercel will:
- Install dependencies
- Run `next build`
- Deploy to edge network

## Step 5: Custom Domain

1. Project Settings → **Domains**
2. Add **www.thesafarsathi.com** (primary) and **thesafarsathi.com** (redirect to www)
3. Configure DNS as instructed by Vercel
4. Set Vercel env: `NEXT_PUBLIC_APP_URL=https://www.thesafarsathi.com`
5. Redeploy after changing environment variables

## Step 6: Firebase Authorized Domains

1. Firebase Console → Authentication → Settings → Authorized domains
2. Add: `www.thesafarsathi.com`
3. Add: `thesafarsathi.com`
4. Keep `localhost` for local dev
5. Optional: keep your `*.vercel.app` preview domain for staging

## Step 7: Razorpay (Live payments)

1. Razorpay Dashboard → **Settings → API Keys** — use Live keys in production
2. Vercel env (all three required):
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same key id as above, public)
3. Ensure Razorpay account KYC is complete for live mode
4. Test a small real payment on https://www.thesafarsathi.com/booking
5. Payment verification runs via `/api/payments/verify` after checkout (client-side callback)

## Performance Tips

- Enable Vercel Analytics in project settings
- Images are optimized via Next.js Image component
- Static pages are pre-rendered at build time
- API routes run as serverless functions

## CI/CD

Vercel automatically redeploys on every push to main. For preview deployments:

- Push to feature branches for preview URLs
- Use Pull Request comments for preview links

## Monitoring

- **Vercel:** Functions tab for API route logs
- **Firebase:** Console for Firestore, Auth, Functions logs
- **Razorpay:** Dashboard for payment analytics

## Rollback

1. Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click **⋯** → **Promote to Production**
