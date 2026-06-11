# Safar Sathi — Authentication & Role Guide

## How login works now

Safar Sathi uses **real registration + login**. You cannot sign in without creating an account first.

| Action | URL |
|--------|-----|
| Customer register | `/register` |
| Staff apply | `/register/staff` |
| Sign in | `/login` |
| Pending approval info | `/pending-approval` |

---

## Role registration rules

| Role | How account is created | Approval needed? | Can login when? |
|------|------------------------|------------------|-----------------|
| **Customer** | Self-register at `/register` | No — auto approved | Immediately after register |
| **Manager** | Apply at `/register/staff` | Yes — admin approves | After Super Admin/Manager approves |
| **Sales Agent** | Apply at `/register/staff` | Yes | After approval |
| **Support Agent** | Apply at `/register/staff` | Yes | After approval |
| **Driver** | Apply at `/register/staff` | Yes | After approval |
| **Super Admin** | Created manually in Firebase (see below) | N/A | Immediately |

---

## Customer flow

```
1. Go to /register
2. Fill name, email, phone, password
3. Click "Create Account"
4. Automatically signed in → redirected to /my-bookings
5. Book packages, vehicles, hotels
6. Sign out from header → must login again to access My Bookings
```

**Test customer:**
- Register: `customer@test.com` / password `123456`
- Login: same credentials at `/login`

---

## Staff flow (Manager, Sales, Support, Driver)

```
1. Go to /register/staff
2. Select role (Manager / Sales Agent / Support Agent / Driver)
3. Fill details + password
4. Submit → redirected to /pending-approval
5. CANNOT login until admin approves
6. Admin approves in Admin → Customers → Pending Approval tab
7. Staff signs in at /login → redirected to their admin section
```

**After approval, login redirects:**

| Role | Redirect after login |
|------|---------------------|
| Manager | `/admin` |
| Sales Agent | `/admin/bookings` |
| Support Agent | `/admin/support` |
| Driver | `/admin/bookings` |

---

## Super Admin — first-time setup (Firebase)

Super Admin is **not** self-registered. Create once in Firebase Console:

### Step 1: Create auth user
1. Firebase Console → **Authentication** → **Users** → **Add user**
2. Email: `admin@safarsathi.com`
3. Password: your secure password

### Step 2: Create Firestore profile
1. Copy the **User UID** from Authentication
2. Firestore → **users** collection → Add document
3. Document ID = UID
4. Fields:

```json
{
  "email": "admin@safarsathi.com",
  "name": "Super Admin",
  "phone": "+919876543210",
  "role": "super_admin",
  "status": "active",
  "approved": true,
  "locale": "en",
  "createdAt": "2026-06-11T00:00:00.000Z",
  "updatedAt": "2026-06-11T00:00:00.000Z"
}
```

### Step 3: Login
1. Go to `/login`
2. Email: `admin@safarsathi.com`
3. Password: your password
4. Redirected to `/admin`

---

## Admin approval workflow

Who can approve: **Super Admin** and **Manager**

```
1. Staff submits application at /register/staff
2. Super Admin logs in → /admin/customers
3. Click tab "Pending Approval"
4. Click "Approve" on the staff user
5. Staff can now login at /login
```

To reject/suspend: click **Reject** (sets status to suspended)

---

## Protected pages

| Page | Requires |
|------|----------|
| `/my-bookings` | Logged-in customer or any user |
| `/admin/*` | Approved staff/admin role |
| `/login`, `/register` | Public |

If unapproved staff tries to login → message shown + redirect to `/pending-approval`

---

## Firebase env variables (Vercel)

Required for live auth:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Also enable **Email/Password** in Firebase Authentication → Sign-in method.

---

## Local development (no Firebase)

If Firebase env vars are not set, auth uses **browser local storage** with the same rules:
- Register required before login
- Staff need admin approval (approve in Admin → Customers → Pending)

---

## Quick test checklist

```
☐ Register new customer → auto login → My Bookings
☐ Logout → try login without register → error
☐ Register staff (Sales Agent) → pending page
☐ Try staff login before approval → blocked
☐ Admin approves staff → staff can login
☐ Super Admin login → admin dashboard
☐ Customer tries /admin → redirected away
```
