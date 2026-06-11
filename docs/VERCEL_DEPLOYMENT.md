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
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
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
2. Add your domain (e.g., `safarsathi.com`)
3. Configure DNS as instructed by Vercel
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain

## Step 6: Firebase Authorized Domains

1. Firebase Console → Authentication → Settings → Authorized domains
2. Add your Vercel domain: `your-app.vercel.app`
3. Add custom domain if configured

## Step 7: Razorpay Webhook (Production)

1. Razorpay Dashboard → Webhooks
2. Add webhook URL: `https://your-domain.com/api/payments/verify`
3. Select events: `payment.captured`, `payment.failed`

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
