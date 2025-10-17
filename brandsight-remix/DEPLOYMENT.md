# BrandSight Deployment Guide for Render

This guide will walk you through deploying BrandSight to Render.com, a modern cloud platform perfect for Shopify apps.

## Prerequisites

Before you begin, make sure you have:

1. **GitHub Account**: Your code must be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Shopify Partner Account**: Create one at [partners.shopify.com](https://partners.shopify.com)
4. **Domain** (Optional): For custom domains

## Part 1: Shopify App Setup

### 1.1 Create Your Shopify App

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
2. Click **Apps** → **Create app**
3. Choose **Custom app** or **Public app** (depending on your needs)
4. Fill in app details:
   - **App name**: BrandSight (or your preferred name)
   - **App URL**: `https://your-app-name.onrender.com` (you'll get this from Render)
   - **Allowed redirection URL(s)**: `https://your-app-name.onrender.com/auth/callback`

### 1.2 Get Your API Credentials

1. In your Shopify app dashboard, go to **App setup**
2. Copy these credentials (you'll need them later):
   - **Client ID** (API key)
   - **Client Secret** (API secret key)

### 1.3 Configure App Scopes

In the **Configuration** tab, request these scopes:
- `read_products`
- `read_orders`
- `read_customers`
- `read_inventory`

## Part 2: Database Setup (Neon PostgreSQL)

### 2.1 Create Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy your connection string - it looks like:
   ```
   postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### 2.2 Initialize Database Schema

You'll do this after deploying to Render (we'll cover it in Part 4).

## Part 3: Render Deployment

### 3.1 Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Select the repository containing BrandSight

### 3.2 Configure Build Settings

- **Name**: `brandsight` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `brandsight-remix` (important!)
- **Runtime**: `Node`
- **Build Command**: `npm ci && npx prisma generate && npm run build`
- **Start Command**: `npm run start`
- **Instance Type**: `Starter` ($7/month) or `Standard` for production

**Note**: We use `npm ci` (clean install) instead of `npm install` to avoid dependency resolution issues.

### 3.3 Add Environment Variables

Click **Advanced** and add these environment variables:

```bash
# Database
DATABASE_URL=<your-neon-connection-string>

# Shopify App Credentials
SHOPIFY_API_KEY=<your-shopify-client-id>
SHOPIFY_API_SECRET=<your-shopify-client-secret>
SCOPES=read_products,read_orders,read_customers,read_inventory

# App URLs (replace with your actual Render URL)
SHOPIFY_APP_URL=https://your-app-name.onrender.com

# Session Secret (generate a random 32-character string)
SESSION_SECRET=<generate-random-32-char-string>

# Node Environment
NODE_ENV=production
```

**To generate a session secret**, run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 3.4 Deploy

1. Click **Create Web Service**
2. Render will automatically build and deploy your app
3. Wait 5-10 minutes for the first deployment
4. Note your app URL: `https://your-app-name.onrender.com`

## Part 4: Post-Deployment Setup

### 4.1 Initialize Database

After your app is deployed, you need to push the database schema:

**Option 1: Using Render Shell**
1. Go to your Render service → **Shell**
2. Run:
   ```bash
   npx prisma db push
   ```

**Option 2: Locally (Recommended)**
1. In your local `brandsight-remix` directory
2. Create `.env` file with your production `DATABASE_URL`
3. Run:
   ```bash
   npm install
   npx prisma db push
   ```

### 4.2 Update Shopify App URLs

Now that you have your Render URL:

1. Go back to Shopify Partner Dashboard
2. Update your app settings:
   - **App URL**: `https://your-app-name.onrender.com`
   - **Allowed redirection URL(s)**: `https://your-app-name.onrender.com/auth/callback`
3. Save changes

## Part 5: Testing Your App

### 5.1 Install on Development Store

1. In Shopify Partners, click **Test on development store**
2. Select a development store (or create one)
3. Click **Install app**
4. You should be redirected to your app on Render

### 5.2 Sync Your Data

1. After installation, click **Sync Data** button
2. Wait for products and orders to import
3. Navigate to **Vendor Analytics** to see your data

## Part 6: Production Considerations

### 6.1 Custom Domain (Optional)

To use a custom domain like `brandsight.yourcompany.com`:

1. In Render, go to **Settings** → **Custom Domains**
2. Add your domain
3. Update DNS records as instructed
4. Update Shopify app URLs to use your custom domain

### 6.2 Monitoring

Render provides built-in monitoring:
- **Logs**: View in Render dashboard → **Logs**
- **Metrics**: CPU, memory, request volume
- **Alerts**: Set up notifications for downtime

### 6.3 Scaling

As your app grows:
- **Upgrade instance type**: Starter → Standard → Pro
- **Enable autoscaling**: In Render settings
- **Database connection pooling**: Already configured via Neon

### 6.4 Backups

Neon provides automatic backups:
- Daily backups for 7 days (free tier)
- Point-in-time restore available
- Manual backups: Go to Neon dashboard → **Backups**

## Part 7: Webhooks (Optional but Recommended)

To keep data in sync automatically:

### 7.1 Register Webhooks

1. In Shopify app settings, go to **Webhooks**
2. Add these webhook subscriptions:
   - **products/create** → `https://your-app.onrender.com/webhooks`
   - **products/update** → `https://your-app.onrender.com/webhooks`
   - **orders/create** → `https://your-app.onrender.com/webhooks`
   - **orders/updated** → `https://your-app.onrender.com/webhooks`

Webhooks are already implemented in the app - they'll automatically sync data as changes happen in Shopify.

## Troubleshooting

### App won't install
- Check that `SHOPIFY_APP_URL` matches your Render URL exactly
- Verify redirect URL in Shopify settings matches `<your-url>/auth/callback`
- Check Render logs for error messages

### Database connection errors
- Verify `DATABASE_URL` is correct in Render environment variables
- Ensure Neon database is active (not paused)
- Check Neon dashboard for connection limits

### Sync not working
- Check Render logs for error messages
- Verify Shopify API scopes are correctly set
- Ensure store is connected and has data to sync

### Build failures
- Check that `Root Directory` is set to `brandsight-remix`
- Verify `package.json` has all required dependencies
- Review Render build logs for specific errors

## Getting Help

- **Render Support**: [render.com/docs](https://render.com/docs)
- **Shopify Docs**: [shopify.dev/docs](https://shopify.dev/docs)
- **Neon Docs**: [neon.tech/docs](https://neon.tech/docs)

## Cost Estimate

- **Render Starter**: $7/month
- **Neon Free Tier**: $0/month (0.5GB storage)
- **Neon Pro**: $19/month (10GB storage, better performance)

**Total**: $7-26/month depending on your needs

## Next Steps

After successful deployment:

1. Install on your production Shopify store
2. Sync your data
3. Explore vendor analytics
4. Set up alert rules for your brands
5. Share with your team!

---

**Congratulations!** Your BrandSight app is now live and ready to provide deep brand-specific insights for your Shopify store. 🎉
