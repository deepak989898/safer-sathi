# Production Checklist - Safar Sathi

Use this checklist before going live.

## Environment & Security

- [ ] All `.env` variables set in Vercel (no secrets in code)
- [ ] `DEMO_MODE=false` in production
- [ ] Firebase security rules deployed
- [ ] Firestore indexes deployed and built
- [ ] Storage rules deployed
- [ ] Firebase authorized domains include production URL
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Rate limiting configured (`RATE_LIMIT_MAX`)

## Firebase

- [ ] Authentication providers enabled (Email, Google)
- [ ] Firestore backup enabled (Blaze plan)
- [ ] Cloud Functions deployed
- [ ] Service account key secured (not in git)
- [ ] Admin user created with `super_admin` role

## Payments

- [ ] Razorpay live keys configured (not test keys)
- [ ] Webhook URL registered in Razorpay dashboard
- [ ] Payment verification tested end-to-end
- [ ] Deposit and full payment flows tested
- [ ] Refund policy documented on Terms page

## AI Services

- [ ] OpenAI or Gemini API key configured
- [ ] AI agent fallbacks tested without API keys
- [ ] Token usage limits monitored
- [ ] Support agent confidence threshold set

## Notifications

- [ ] Email service configured (Resend/SendGrid)
- [ ] WhatsApp Business API or webhook configured
- [ ] SMS provider ready (optional)
- [ ] Test booking confirmation email received
- [ ] Test WhatsApp notification received

## Content & SEO

- [ ] All pages have meta titles and descriptions
- [ ] Schema markup on package/hotel detail pages
- [ ] Sitemap generated
- [ ] robots.txt configured
- [ ] Google Search Console verified
- [ ] Blog posts published

## Legal & Compliance

- [ ] Terms of Service page reviewed
- [ ] Privacy Policy page reviewed
- [ ] GDPR/data protection compliance (if applicable)
- [ ] Cancellation & refund policy clear on FAQ

## Performance

- [ ] Lighthouse score > 90 (Performance, Accessibility, SEO)
- [ ] Images optimized (WebP, lazy loading)
- [ ] Core Web Vitals passing
- [ ] Mobile responsiveness tested on real devices

## Monitoring

- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry optional)
- [ ] Firebase usage alerts set
- [ ] Razorpay dashboard monitored
- [ ] Admin audit logs reviewed regularly

## Backup & Recovery

- [ ] Firestore automated backups enabled
- [ ] Deployment rollback procedure documented
- [ ] Database export tested

## Launch Day

- [ ] DNS propagated to Vercel
- [ ] SSL certificate active
- [ ] Smoke test: Home → Search → Book → Pay → Confirm
- [ ] Admin dashboard accessible
- [ ] AI assistant responding
- [ ] Support contact form working
- [ ] Social media accounts linked in footer

## Post-Launch

- [ ] Monitor first 24h of bookings
- [ ] Review AI agent task logs
- [ ] Check fraud detection flags
- [ ] Gather initial customer feedback
- [ ] Schedule weekly analytics review
