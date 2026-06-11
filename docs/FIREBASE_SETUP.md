# Firebase Setup Guide - Safar Sathi

This guide walks you through setting up Firebase for the Safar Sathi platform.

## Prerequisites

- Google account
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Name it `safar-sathi` (or your preferred name)
4. Enable Google Analytics (optional)
5. Create the project

## Step 2: Enable Authentication

1. In Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Enable **Google** (optional)
4. Enable **Phone** (optional, for OTP login)

## Step 3: Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Start in **production mode**
3. Choose region: `asia-south1` (Mumbai) for India
4. Deploy security rules:

```bash
cd safar-sathi
firebase login
firebase init firestore
# Select existing project, use firebase/firestore.rules and firebase/firestore.indexes.json
firebase deploy --only firestore:rules,firestore:indexes
```

## Step 4: Enable Storage

1. Go to **Storage** → **Get started**
2. Deploy storage rules:

```bash
firebase deploy --only storage
```

## Step 5: Get Web App Config

1. Project Settings → **General** → **Your apps**
2. Click **Web** icon (</>)
3. Register app name: `Safar Sathi Web`
4. Copy config values to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Step 6: Service Account (Admin SDK)

1. Project Settings → **Service accounts**
2. Click **Generate new private key**
3. Add to `.env.local`:

```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
```

## Step 7: Deploy Cloud Functions

```bash
cd firebase/functions
npm install
cd ../..
firebase deploy --only functions
```

## Step 8: Seed Demo Data

With the dev server running:

```bash
curl -X POST http://localhost:3000/api/seed
```

Or use the Firebase Admin SDK to import collections from `src/data/demo-data.ts`.

## Firestore Collections

| Collection | Description |
|------------|-------------|
| users | User profiles & roles |
| vehicles | Cars, SUVs, buses, tempo travellers |
| packages | Tour packages |
| hotels | Hotels & rooms |
| bookings | Customer bookings |
| payments | Payment records |
| supportTickets | Support requests |
| notifications | Email/WhatsApp/SMS logs |
| reviews | Customer reviews |
| blogs | Blog posts |
| analytics | Dashboard metrics |
| auditLogs | Admin activity logs |
| aiTasks | AI agent task queue |
| workflows | Automation workflows |
| drivers | Driver profiles |

## RBAC Roles

Set the `role` field in user documents:

- `super_admin` - Full access
- `manager` - Admin panel access
- `sales_agent` - Bookings & customers
- `support_agent` - Support tickets
- `driver` - Assigned trips
- `customer` - Default for new users

Custom claims are set automatically via Cloud Function `setUserRole`.

## Troubleshooting

**Rules deployment fails:** Ensure you're logged in with `firebase login` and have Owner/Editor role.

**Index errors:** Deploy indexes with `firebase deploy --only firestore:indexes` and wait for build completion in console.

**CORS issues:** Firebase Storage CORS is configured automatically for web apps.
