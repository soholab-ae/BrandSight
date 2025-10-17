# BrandSight Remix - Setup Guide

## What's Been Created

I've initialized a complete Shopify Remix app structure with Polaris components in the `brandsight-remix/` directory. This is a production-ready foundation for your brand analytics app.

### ✅ Project Structure Created

```
brandsight-remix/
├── app/
│   ├── routes/
│   │   ├── app._index.tsx      # Dashboard with Polaris components
│   │   ├── auth.$.tsx           # Shopify OAuth handler
│   │   └── webhooks.tsx         # Webhook endpoints
│   ├── shopify.server.ts        # Shopify configuration
│   ├── db.server.ts             # Prisma client
│   └── root.tsx                 # App layout with Polaris AppProvider
├── prisma/
│   └── schema.prisma            # Ready for db pull
├── package.json                 # All dependencies configured
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite build config
├── shopify.app.toml            # Shopify app config
└── .env.example                # Environment template
```

### ✅ Technologies Configured

- **Frontend:** Remix 2.14 + Shopify Polaris 13.9
- **Backend:** Shopify App Remix 3.4
- **Database:** Prisma 5.20 (ready for PostgreSQL)
- **Auth:** Built-in Shopify OAuth + Session Tokens
- **Webhooks:** Configured for products, orders, customers, GDPR

---

## Installation Steps

### Step 1: Install Dependencies

```bash
cd brandsight-remix
npm install
```

This will install:
- `@shopify/polaris` - Shopify's design system
- `@shopify/shopify-app-remix` - Authentication & API
- `@prisma/client` - Database ORM
- `@remix-run/react` - Remix framework
- And all other dependencies

### Step 2: Set Up Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Then edit `.env` with your credentials:

```env
# Shopify Configuration
SHOPIFY_API_KEY=your_api_key_from_partner_dashboard
SHOPIFY_API_SECRET=your_api_secret_from_partner_dashboard
SCOPES=read_products,write_products,read_orders,read_customers,read_inventory,write_script_tags
SHOPIFY_APP_URL=https://your-replit-url.replit.dev
HOST=https://your-replit-url.replit.dev

# Database (use existing Neon database)
DATABASE_URL=postgresql://your_neon_connection_string

# Node Environment
NODE_ENV=development
```

### Step 3: Pull Existing Database Schema (SAFE METHOD)

Instead of creating a new schema, we'll reverse-engineer the existing Neon database:

```bash
# This safely pulls the existing schema into Prisma
npx prisma db pull

# Generate Prisma client
npx prisma generate
```

**What this does:**
- ✅ Reads your existing PostgreSQL database structure
- ✅ Generates matching Prisma schema
- ✅ No data changes or migrations
- ✅ Safe to run on production database

### Step 4: Add Shopify Session Storage

After pulling the schema, add the Shopify session model to `prisma/schema.prisma`:

```prisma
model Session {
  id          String    @id
  shop        String
  state       String
  isOnline    Boolean   @default(false) @map("is_online")
  scope       String?
  expires     DateTime?
  accessToken String    @map("access_token")
  userId      BigInt?   @map("user_id")

  @@map("sessions")
}
```

Then run:

```bash
npx prisma db push
npx prisma generate
```

### Step 5: Update shopify.app.toml

Edit `shopify.app.toml` and update:

```toml
client_id = "YOUR_API_KEY"
application_url = "https://your-replit-url.replit.dev"

[auth]
redirect_urls = [
  "https://your-replit-url.replit.dev/auth/callback",
  "https://your-replit-url.replit.dev/auth/shopify/callback"
]
```

### Step 6: Start Development Server

```bash
npm run dev
```

**What happens:**
- Shopify CLI starts
- Prompts you to login to Partner account
- Creates a tunnel for local development
- Provides an install URL
- Registers webhooks automatically

---

## Testing the App

### 1. Install on Development Store

After running `npm run dev`, the CLI will give you an install URL:

```
https://your-tunnel-url.cloudflare.com/install?shop=your-dev-store.myshopify.com
```

Click this URL to install the app on your development store.

### 2. Verify Dashboard Loads

After installation, you should see:
- BrandSight dashboard with Polaris styling
- Connected shop name
- Placeholder metrics (will be populated with real data later)

### 3. Check Webhooks

Go to your Shopify Partner Dashboard:
- Apps → Your App → Configuration → Webhooks
- Verify all webhooks are registered

---

## Next Steps: Building Features

Now that the foundation is ready, here's the roadmap for building out the analytics features:

### Phase 1: Data Models (Week 1-2)

1. **Complete Prisma Schema**
   - Add Vendor model
   - Add Product model
   - Add Order models
   - Add Analytics models

2. **Create Data Services**
   - `app/models/vendor.server.ts` - Vendor CRUD
   - `app/models/analytics.server.ts` - Analytics aggregation
   - `app/models/shopify.server.ts` - Shopify sync

3. **Implement Shopify Data Sync**
   - Initial product import
   - Initial order import
   - Webhook handlers for real-time updates

### Phase 2: Core Analytics Pages (Week 3-4)

1. **Vendor Analytics** (`app/routes/app.vendors.tsx`)
   - Polaris IndexTable with vendor metrics
   - Sorting, filtering, pagination
   - Revenue, AOV, conversion rate calculations

2. **Sales Analytics** (`app/routes/app.sales.tsx`)
   - Polaris Viz charts for revenue trends
   - Brand comparison visualizations
   - Top products by brand

3. **Product Performance** (`app/routes/app.products.tsx`)
   - Product listing with vendor grouping
   - Performance metrics per product

### Phase 3: Advanced Features (Week 5-6)

1. **Customer Loyalty** (`app/routes/app.customers.tsx`)
   - Brand affinity scores
   - Loyalty segments
   - Cross-brand purchase analysis

2. **Smart Alerts** (`app/routes/app.alerts.tsx`)
   - Alert configuration UI
   - Alert rules management
   - Notification center

3. **Reports & Export** (`app/routes/app.reports.tsx`)
   - CSV/Excel export functionality
   - Custom report builder

### Phase 4: Polish & Deploy (Week 7-8)

1. **Testing**
   - End-to-end authentication flow
   - All CRUD operations
   - Webhook processing
   - Export functionality

2. **Deployment to Render**
   - Configure Render Blueprint
   - Set up production database
   - Environment variables
   - Custom domain

---

## Architecture Benefits

### vs. Current App (React + Tailwind)

| Feature | Current App | New Remix App |
|---------|-------------|---------------|
| Design System | Custom Tailwind | Shopify Polaris |
| Authentication | Custom implementation | Built-in secure OAuth |
| Session Storage | Custom PostgreSQL class | Official Prisma adapter |
| App Bridge | Manual setup | Pre-configured |
| Routing | Wouter (client) | Remix (server + client) |
| Data Fetching | React Query | Remix loaders |
| Forms | React Hook Form | Remix actions |
| Security | Multiple vulnerabilities | Production-ready |

### Why This Is Better

1. **Official Shopify Stack** - Using their recommended tools
2. **Better Security** - Built-in protection against common vulnerabilities
3. **Faster Performance** - Server-side rendering + optimized loading
4. **Easier Maintenance** - Less custom code to maintain
5. **Better DX** - TypeScript end-to-end with type safety
6. **Future-Proof** - Aligned with Shopify's roadmap

---

## Deployment to Render

### 1. Create Render Account

Go to https://render.com and sign up.

### 2. Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repo
3. Configure:
   - **Name:** brandsight-remix
   - **Environment:** Node
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Starter ($7/month) or Professional ($25/month)

### 3. Add Environment Variables

In Render dashboard, add:
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SCOPES`
- `SHOPIFY_APP_URL` (your Render URL)
- `DATABASE_URL` (Neon connection string)
- `NODE_ENV=production`

### 4. Configure Neon Database

1. Go to https://neon.tech
2. Create production database
3. Copy connection string to Render

### 5. Update shopify.app.toml

Change URLs to production:

```toml
application_url = "https://brandsight-remix.onrender.com"

[auth]
redirect_urls = [
  "https://brandsight-remix.onrender.com/auth/callback"
]
```

### 6. Deploy

Render will automatically:
- Build your app
- Run Prisma migrations
- Start the server
- Provide HTTPS URL

---

## Troubleshooting

### "Module not found" errors

```bash
npm install
npx prisma generate
```

### Database connection errors

Check your DATABASE_URL in `.env` is correct:
```bash
npx prisma db pull
```

### Auth loops

Make sure your `SHOPIFY_APP_URL` matches your actual URL:
```bash
# In .env
SHOPIFY_APP_URL=https://your-actual-url.replit.dev
```

### Webhooks not firing

Run:
```bash
npm run config:push
```

This re-registers webhooks with Shopify.

---

## Resources

- **Shopify Remix Docs:** https://shopify.dev/docs/apps/build/build?framework=remix
- **Polaris Components:** https://polaris-react.shopify.com/components
- **Prisma Docs:** https://www.prisma.io/docs
- **Render Docs:** https://render.com/docs

---

## Current Status

✅ **Completed:**
- Project structure created
- Shopify authentication configured
- Polaris AppProvider set up
- Basic dashboard route
- Webhook endpoints
- Database configuration

🚧 **Next Steps:**
1. Install dependencies (`npm install`)
2. Pull database schema (`npx prisma db pull`)
3. Start dev server (`npm run dev`)
4. Build out analytics features

---

**Ready to start building!** Run `npm install` in the `brandsight-remix/` directory to begin.
