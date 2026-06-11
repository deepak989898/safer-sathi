# Safar Sathi — Complete Testing Guide

Use this guide to test every role and feature on your live site or locally (`npm run dev`).

---

## Before You Start

| Item | Local | Live (Vercel) |
|------|-------|---------------|
| Website | http://localhost:3000 | https://safer-sathi.vercel.app |
| Admin | http://localhost:3000/admin | https://safer-sathi.vercel.app/admin |
| AI Assistant | `/ai-assistant` | `/ai-assistant` |

**Mobile test:** Open site on phone OR Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M) → iPhone / Samsung.

---

## Mobile-Friendly Checklist

Test these on mobile (375px width):

- [ ] Home hero + search widget stacks correctly
- [ ] Header hamburger menu opens all links
- [ ] Package / Vehicle / Hotel grids show 1 column
- [ ] Filter sidebar stacks above listings
- [ ] AI Assistant chat fills screen, input at bottom
- [ ] Checkout steps are readable and tappable
- [ ] Admin sidebar scrolls on tablet

---

## Role 1: Customer (Website Visitor)

**Login:** `/register` or `/login` with any email (without "admin" in it)

### Flow A — Browse & Book a Package

1. Open **Home** → use search widget (Packages tab)
2. Go to **Tour Packages** → apply filters (price, category)
3. Click **View Details** on Golden Triangle Tour
4. Select date + guests → **Book Now**
5. **Checkout** → Step 1: enter name, email, phone
6. Step 2: review booking summary
7. Step 3: payment → **Confirm & Pay**
8. Note booking reference number in toast
9. Go to **My Bookings** → see your booking with status badge

### Flow B — Book a Vehicle

1. **Vehicles** → filter by SUV / Tempo
2. Open **Toyota Innova Crysta** detail
3. Select dates → **Book Your Ride**
4. Complete checkout (same 3 steps)

### Flow C — Book a Hotel

1. **Hotels** → filter by city or star rating
2. Open hotel detail → select dates → **Book Now**
3. Complete checkout

### Flow D — Bus Booking

1. **Bus Booking** → search Delhi → Jaipur
2. View route list → **Select Seat**
3. Proceed to checkout

### Flow E — AI Travel Assistant

1. Open **AI Assistant** (`/ai-assistant`)
2. Click a quick suggestion OR type: *"Plan a 5-day trip to Rajasthan"*
3. AI replies with recommendations + package cards
4. Click a package card → goes to package detail
5. Try Hindi: switch language (globe icon) → ask in Hindi
6. Try: *"I need a 7 seater vehicle"* → see vehicle suggestions

### Flow F — Other Pages

| Page | What to verify |
|------|----------------|
| Contact | Form submits, info displays |
| FAQ | Tabs expand/collapse |
| Blog | List + detail pages load |
| Gallery | Image grid responsive |
| Reviews | Review cards show ratings |
| About | Company info loads |

---

## Role 2: Super Admin

**Login:** `/login` with email containing **admin** (e.g. `admin@safarsathi.com`)

### Dashboard (`/admin`)

- [ ] 4 metric cards show (Bookings, Revenue, Vehicles, Customers)
- [ ] Revenue line chart renders
- [ ] Top Destinations pie chart renders

### Manage Operations

| Section | Test |
|---------|------|
| **Bookings** | Table shows ID, customer, amount, status, AI status |
| **Vehicles** | Table loads → **Add Vehicle** dialog opens |
| **Packages** | All packages listed with ratings |
| **Hotels** | Hotel list with star ratings |
| **Customers** | CRM table with VIP/Regular badges |
| **Support** | Support tickets with priority badges |
| **Marketing** | Blog/content overview |
| **Workflows** | Automation workflow list |
| **Roles** | RBAC roles table (Super Admin, Manager, etc.) |
| **Settings** | Settings form loads |

### AI Command Center

| Section | Test |
|---------|------|
| **AI Agents** | 6 agent cards with success rate + status |
| **Analytics** | Revenue trend + bookings bar chart |

---

## Role 3: Manager

Same as Super Admin except:

- Cannot change role permissions (view only in Roles)
- Full access to bookings, vehicles, packages, analytics

**Test:** Login with Firebase user where `role: "manager"` in Firestore.

---

## Role 4: Sales Agent

**Access:** Bookings, Customers, AI Sales Agent data

### Test Flow

1. Login with `role: "sales_agent"`
2. Open **Admin → Customers** → view segments (VIP, Regular)
3. Open **Admin → Bookings** → filter upcoming bookings
4. API test (optional):

```powershell
curl -X POST https://safer-sathi.vercel.app/api/ai/sales `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"interest\":\"Golden Triangle\"}"
```

---

## Role 5: Support Agent

**Access:** Support tickets, bookings (read), AI Support Agent

### Test Flow

1. Login with `role: "support_agent"`
2. **Admin → Support** → view open tickets
3. Test AI Support API:

```powershell
curl -X POST https://safer-sathi.vercel.app/api/ai/support `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"What is my booking status for SS-2025-001234?\"}"
```

---

## Role 6: Driver

**Access:** Assigned trips only (via Firebase `drivers` collection)

### Test Flow

1. Create driver in Firestore with `role: "driver"`
2. Assign vehicle IDs to driver document
3. Driver logs in → sees assigned trips (when Firebase auth is fully wired)

---

## AI Agents — API Testing

Replace URL with your live domain:

### Travel Agent
```
POST /api/ai/travel
{ "message": "Family trip 5 days under 30000", "locale": "en" }
```

### Booking Agent
```
POST /api/ai/booking
{ "serviceType": "package", "serviceId": "p1", "customerEmail": "test@test.com" }
```

### Support Agent
```
POST /api/ai/support
{ "message": "What is your cancellation policy?" }
```

### Marketing Agent
```
POST /api/ai/marketing
{ "type": "blog", "topic": "Best monsoon destinations", "locale": "en" }
```

### Fraud Agent
```
POST /api/ai/fraud
{ "customerEmail": "test@test.com", "amount": 500000 }
```

### Analytics Agent
```
GET /api/ai/analytics
```

---

## Automation & Firebase Flow

When Firebase is connected, these run automatically:

| Trigger | What happens |
|---------|--------------|
| New booking created | Invoice workflow → WhatsApp → Email → CRM update |
| Payment success | Booking confirmed → customer notified |
| Trip completed | Review request → discount offer |
| New booking | Fraud check runs |

**Test locally:** Create booking via checkout → check Firebase Functions logs in console.

---

## Payment Flow (Razorpay)

1. Add to Vercel env:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
2. Checkout → Confirm triggers `/api/payments/create-order`
3. Complete Razorpay payment → `/api/payments/verify`
4. Booking status updates to **Confirmed**

Without Razorpay keys, booking still creates via `/api/bookings`.

---

## Notifications Flow

| Channel | Env variable | Test |
|---------|-------------|------|
| Email | `EMAIL_API_URL`, `EMAIL_API_KEY` | POST `/api/notifications/send` |
| WhatsApp | `WHATSAPP_WEBHOOK_URL` | POST `/api/notifications/send` |
| SMS | `SMS_API_URL` | Ready architecture |

---

## Full End-to-End Test (15 minutes)

```
1. Home → Search packages
2. AI Assistant → Get recommendation → Click package
3. Book package → Checkout → Confirm
4. My Bookings → Verify booking appears
5. Login as admin → Admin dashboard
6. Admin → Bookings → See new booking
7. Admin → AI Agents → All active
8. Mobile view → Repeat steps 1-3
9. Switch to Hindi → Verify translations
10. Toggle dark mode → Verify theme
```

---

## Push Updates to Live

```powershell
cd "E:\SafarSathi Tour Booking\safar-sathi"
git add .
git commit -m "Your update message"
git push origin main
```

Vercel auto-deploys in 2–5 minutes.

---

## Support

| Issue | Fix |
|-------|-----|
| AI not responding | Check `/api/ai/travel` in browser Network tab |
| Booking not saving | Check `/api/bookings` response |
| Admin 404 | Login with email containing "admin" |
| Mobile layout broken | Hard refresh (Ctrl+Shift+R) |
