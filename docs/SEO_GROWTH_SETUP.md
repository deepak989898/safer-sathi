# Safar Sathi — SEO & Growth Setup Guide

After deploying the growth system, complete these steps to activate analytics and search visibility.

## 1. Create a Google Analytics 4 property

1. Go to https://analytics.google.com
2. Admin → Create → Property
3. Name: Safar Sathi | Time zone: India | Currency: INR
4. Create Web stream for https://www.thesafarsathi.com

## 2. Get GA4 Measurement ID

1. Admin → Data streams → your web stream
2. Copy Measurement ID (`G-XXXXXXXXXX`)
3. Set `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` in production env
4. Redeploy

## 3. Create Microsoft Clarity project

1. Go to https://clarity.microsoft.com
2. Add project: Safar Sathi | https://www.thesafarsathi.com

## 4. Get Clarity ID

1. Project Settings → Setup
2. Set `NEXT_PUBLIC_CLARITY_ID=your_id` in production env
3. Redeploy

## 5. Submit sitemap in Google Search Console

1. https://search.google.com/search-console
2. Add property https://www.thesafarsathi.com
3. Sitemaps → submit `sitemap.xml`

URL: https://www.thesafarsathi.com/sitemap.xml

## 6. Verify Search Console

Add meta verification code:

`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_code`

Or verify via DNS TXT record.

## 7. Show GSC metrics in Admin SEO Center

The admin panel reads clicks, impressions, CTR, and position from the **Google Search Console API** (not just site verification).

1. In [Google Cloud Console](https://console.cloud.google.com) (same project as Firebase), enable **Google Search Console API**.
2. Copy your Firebase service account email from Vercel env (`FIREBASE_CLIENT_EMAIL`, e.g. `firebase-adminsdk-…@….iam.gserviceaccount.com`).
3. In [Search Console](https://search.google.com/search-console) → **Settings** → **Users and permissions** → **Add user** → paste that email with **Full** access.
4. Optional: set `GSC_SITE_URL=https://www.thesafarsathi.com/` if auto-detect does not match your property.
5. Redeploy and open `/admin/seo-center` — metrics should match GSC (last 7 days).

## 8. Google Business Profile

1. https://business.google.com
2. Safar Sathi | Travel agency
3. 352 Travel Hub, Connaught Place, New Delhi 110001
4. Phone +91 9217290871 | Website https://www.thesafarsathi.com

## Environment variables

```
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_CLARITY_ID=
NEXT_PUBLIC_SITE_URL=https://www.thesafarsathi.com
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
# GSC_SITE_URL=https://www.thesafarsathi.com/
```

## Admin

- SEO Center: /admin/seo-center
- AI SEO: /admin/ai-center?tab=seo
- AI Blog: /admin/ai-center?tab=blog-writer
