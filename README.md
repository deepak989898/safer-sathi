# Safar Sathi

**AI-Powered Tour & Travels Management Platform**

Safar Sathi is an enterprise-grade SaaS travel platform where most operations are automated through AI Agents. Admins monitor, approve exceptional cases, and view analytics.

![Safar Sathi Platform](https://images.unsplash.com/photo-1524492412937-280b457d55e8?w=1200&q=80)

## Features

### Customer Website
- Premium responsive travel website with 20+ pages
- Advanced search with filters (price, location, vehicle type, dates)
- Instant booking with Razorpay payments
- AI Travel Assistant (conversational chat)
- Hindi & English multilingual support
- Dark/Light mode

### Admin Command Center
- Enterprise dashboard with revenue charts & analytics
- Booking, vehicle, package, hotel management
- AI Agents control panel (6 autonomous agents)
- Customer CRM with segmentation
- RBAC role management
- Automation workflow engine

### AI Agents
| Agent | Purpose |
|-------|---------|
| Travel Agent | Trip planning & recommendations |
| Booking Agent | Autonomous booking & invoicing |
| Support Agent | 24/7 customer support |
| Sales Agent | Lead follow-ups & abandoned bookings |
| Marketing Agent | Blog & social content generation |
| Analytics Agent | Revenue forecasting & demand trends |
| SEO Agent | Meta tags & schema markup |
| Fraud Agent | Suspicious booking detection |

## Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions)
- **AI:** OpenAI API, Gemini API
- **Payments:** Razorpay
- **Notifications:** WhatsApp, Email, SMS-ready
- **Hosting:** Vercel

## Quick Start

```bash
# Clone and install
cd safar-sathi
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the customer website.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin panel.

**Demo Login:** Use `admin@email.com` on the login page to access admin.

## Project Structure

```
safar-sathi/
├── src/
│   ├── app/
│   │   ├── (customer)/     # Customer website pages
│   │   ├── (auth)/         # Login & Register
│   │   ├── admin/          # Admin command center
│   │   └── api/            # API routes
│   ├── components/
│   │   ├── ui/             # Shadcn UI components
│   │   ├── layout/         # Header, Footer
│   │   ├── customer/       # Customer components
│   │   └── admin/          # Admin components
│   ├── lib/
│   │   ├── ai/             # AI agent implementations
│   │   ├── firebase/       # Firebase config
│   │   ├── payments/       # Razorpay integration
│   │   ├── notifications/  # Email, WhatsApp, SMS
│   │   └── automation/     # Workflow engine
│   ├── data/               # Demo data
│   └── types/              # TypeScript types
├── firebase/
│   ├── firestore.rules     # Security rules
│   ├── firestore.indexes.json
│   ├── storage.rules
│   └── functions/          # Cloud Functions
└── docs/                   # Setup & deployment guides
```

## Documentation

- [Firebase Setup Guide](docs/FIREBASE_SETUP.md)
- [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md)
- [Production Checklist](docs/PRODUCTION_CHECKLIST.md)

## Demo Mode

The app works out of the box with demo data. No Firebase or API keys required for development. Set `DEMO_MODE=true` in `.env.local`.

## License

Proprietary - Safar Sathi © 2025
