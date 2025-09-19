# BrandSight - Fly.io Deployment Guide

Complete guide for migrating BrandSight from Replit to Fly.io to resolve Shopify iframe embedding issues.

## Overview

This guide covers the complete migration process for deploying BrandSight on Fly.io. The application is already optimized for production with a Dockerfile, fly.toml configuration, and proper CSP headers for Shopify embedding.

---

## 1. Fly.io Account & CLI Setup

### Account Setup Requirements

1. **Create Fly.io Account**:
   - Visit [fly.io/app/sign-up](https://fly.io/app/sign-up)
   - Sign up with GitHub/email
   - Verify your email address

2. **Billing Setup**:
   - Add a credit card to your account (required for deployment)
   - Fly.io offers $5/month free allowance
   - BrandSight will run on the cheapest tier (~$1.94/month for shared-cpu-1x + $0.02/GB data transfer)

3. **Install Fly CLI**:

   **macOS/Linux:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

   **Windows (PowerShell):**
   ```powershell
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

   **Alternative (Homebrew on macOS):**
   ```bash
   brew install flyctl
   ```

4. **Login to Fly.io**:
   ```bash
   fly auth login
   ```

---

## 2. Environment Variables & Secrets

### Required Environment Variables

BrandSight requires these environment variables for production:

#### Core Application Settings
```bash
NODE_ENV=production
PORT=8080
```

#### Database Configuration
```bash
DATABASE_URL=your_postgresql_database_url
```

#### Shopify Integration (Critical)
```bash
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SCOPES=read_products,read_orders,read_customers
HOST=https://your-app-name.fly.dev
USE_SHOPIFY_AUTH=true
```

#### Security & Session Management
```bash
SESSION_SECRET=your_secure_random_session_secret_min_32_chars
TOKEN_ENCRYPTION_KEY=your_encryption_key_32_chars
```

#### Optional Performance Settings
```bash
NPM_CONFIG_UPDATE_NOTIFIER=false
NPM_CONFIG_FUND=false
VITE_NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=512
```

### How to Set Secrets in Fly.io

1. **Set secrets one by one:**
   ```bash
   fly secrets set NODE_ENV=production
   fly secrets set PORT=8080
   fly secrets set DATABASE_URL="your_database_url_here"
   fly secrets set SHOPIFY_API_KEY="your_shopify_api_key"
   fly secrets set SHOPIFY_API_SECRET="your_shopify_api_secret"
   fly secrets set SCOPES="read_products,read_orders,read_customers"
   fly secrets set HOST="https://your-app-name.fly.dev"
   fly secrets set USE_SHOPIFY_AUTH=true
   fly secrets set SESSION_SECRET="your_32_char_random_string"
   fly secrets set TOKEN_ENCRYPTION_KEY="your_32_char_encryption_key"
   ```

2. **Set multiple secrets at once:**
   ```bash
   fly secrets set \
     NODE_ENV=production \
     PORT=8080 \
     DATABASE_URL="your_database_url" \
     SHOPIFY_API_KEY="your_api_key" \
     SHOPIFY_API_SECRET="your_api_secret" \
     SCOPES="read_products,read_orders,read_customers" \
     HOST="https://your-app-name.fly.dev" \
     USE_SHOPIFY_AUTH=true \
     SESSION_SECRET="your_session_secret" \
     TOKEN_ENCRYPTION_KEY="your_encryption_key"
   ```

### Generating Required Secrets

**Session Secret & Token Encryption Key:**
```bash
# Generate 32-character random strings
openssl rand -hex 32  # For SESSION_SECRET
openssl rand -hex 32  # For TOKEN_ENCRYPTION_KEY
```

---

## 3. Database Setup

### Option A: Use Existing Neon Database (Recommended)

If you have an existing Neon database from Replit:

1. **Get your DATABASE_URL from Replit**:
   - Copy the existing `DATABASE_URL` from your Replit environment
   - This will maintain your existing data

2. **Set it in Fly.io**:
   ```bash
   fly secrets set DATABASE_URL="your_existing_neon_database_url"
   ```

### Option B: Create New PostgreSQL Database

1. **Create Fly PostgreSQL cluster**:
   ```bash
   fly postgres create --name brandsight-db
   ```

2. **Get connection details**:
   ```bash
   fly postgres connect -a brandsight-db
   ```

3. **Set DATABASE_URL**:
   ```bash
   fly secrets set DATABASE_URL="postgresql://username:password@host:port/database"
   ```

---

## 4. App Creation & Deployment

### Step 1: Create Fly.io App

1. **Navigate to your project directory**:
   ```bash
   cd /path/to/brandsight
   ```

2. **Launch the app** (this will use your existing fly.toml):
   ```bash
   fly launch --no-deploy
   ```
   - Choose your app name (e.g., `brandsight-analytics`, `my-brandsight`)
   - Select region closest to your users (iad for US East, lhr for Europe)
   - Say "No" to PostgreSQL if using existing Neon database
   - Say "No" to Redis

3. **Update fly.toml if needed** (app name should match what you chose):
   ```toml
   app = "your-chosen-app-name"
   primary_region = "iad"  # or your chosen region
   ```

### Step 2: Set All Environment Variables

Set all the environment variables listed in Section 2 above, making sure to update the HOST variable:

```bash
fly secrets set HOST="https://your-chosen-app-name.fly.dev"
```

### Step 3: Deploy the Application

1. **Deploy**:
   ```bash
   fly deploy
   ```

2. **Monitor deployment**:
   ```bash
   fly logs
   ```

3. **Check status**:
   ```bash
   fly status
   ```

### Step 4: Verify Deployment

1. **Check health endpoint**:
   ```bash
   curl https://your-app-name.fly.dev/health
   ```
   Should return: `{"status":"ok","timestamp":"2025-09-19T..."}`

2. **Check app in browser**:
   - Visit `https://your-app-name.fly.dev`
   - Should show the BrandSight landing page

---

## 5. Shopify App Configuration Updates

### Update Shopify Partner Dashboard

1. **Login to Shopify Partners**:
   - Go to [partners.shopify.com](https://partners.shopify.com)
   - Navigate to your BrandSight app

2. **Update App URLs**:
   
   **App URL:**
   ```
   https://your-app-name.fly.dev
   ```
   
   **Allowed redirection URLs:**
   ```
   https://your-app-name.fly.dev/api/auth/callback
   https://your-app-name.fly.dev/api/auth/oauth/callback
   ```

3. **Update Webhook URLs**:
   ```
   https://your-app-name.fly.dev/api/webhooks
   ```

4. **Verify App Settings**:
   - **Embedded**: ✅ Enabled
   - **Scopes**: `read_products,read_orders,read_customers`
   - **Distribution**: Choose based on your needs

### Update Local Configuration Files

Update the `shopify.app.toml` file:

```toml
name = "BrandSight"
client_id = "${SHOPIFY_API_KEY}"
application_url = "https://your-app-name.fly.dev"
embedded = true

[access_scopes]
scopes = "read_products,read_orders,read_customers"

[auth]
redirect_urls = [
  "https://your-app-name.fly.dev/api/auth/callback",
  "https://your-app-name.fly.dev/api/auth/oauth/callback"
]

[webhooks]
api_version = "2024-10"

[[webhooks.subscriptions]]
topics = ["app/uninstalled"]
compliance_topics = ["customers/data_request", "customers/redact", "shop/redact"]
uri = "/api/webhooks"

[[webhooks.subscriptions]]
topics = ["orders/create", "orders/updated", "products/create", "products/update", "customers/create"]
uri = "/api/webhooks"
```

---

## 6. Post-Deployment Verification & Testing

### Test Embedded App Functionality

1. **Install in Development Store**:
   - Go to Shopify Partners Dashboard
   - Find your app and click "Test on development store"
   - Complete the OAuth installation flow

2. **Verify Embedded Loading**:
   - App should load within Shopify admin iframe
   - No CORS or CSP errors in browser console
   - Navigation should work smoothly

3. **Test Core Features**:
   - ✅ Dashboard loads with analytics
   - ✅ Product sync works
   - ✅ Vendor data displays correctly
   - ✅ Export functionality works
   - ✅ Settings and billing (if applicable)

### Webhook Testing

1. **Create test data in your development store**:
   - Add products
   - Create test orders
   - Add customers

2. **Monitor webhook delivery**:
   ```bash
   fly logs
   ```
   Look for webhook processing logs like:
   ```
   Received orders/create webhook from shop.myshopify.com
   Successfully processed orders/create webhook
   ```

### Performance Verification

1. **Check response times**:
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s https://your-app-name.fly.dev/health
   ```

2. **Monitor application logs**:
   ```bash
   fly logs --follow
   ```

3. **Check resource usage**:
   ```bash
   fly vm status
   ```

---

## 7. Monitoring & Troubleshooting

### Accessing Logs

1. **Real-time logs**:
   ```bash
   fly logs --follow
   ```

2. **Historical logs**:
   ```bash
   fly logs --since 1h  # Last hour
   fly logs --since 1d  # Last day
   ```

3. **Filter logs by type**:
   ```bash
   fly logs | grep ERROR
   fly logs | grep webhook
   ```

### Common Issues & Solutions

#### 1. App Won't Load in Shopify Admin

**Symptoms**: Blank iframe or "App couldn't be loaded" error

**Solutions**:
```bash
# Check if CSP headers are correct
curl -I https://your-app-name.fly.dev

# Verify HOST environment variable
fly secrets list | grep HOST

# Check logs for CORS/CSP errors
fly logs | grep -i "csp\|cors\|frame"
```

#### 2. Database Connection Issues

**Symptoms**: 500 errors, "Database connection failed"

**Solutions**:
```bash
# Verify DATABASE_URL is set
fly secrets list | grep DATABASE_URL

# Test database connectivity
fly ssh console
# Then in the container:
node -e "console.log(process.env.DATABASE_URL)"
```

#### 3. Shopify Authentication Fails

**Symptoms**: OAuth redirect errors, "Invalid API key"

**Solutions**:
```bash
# Check Shopify credentials
fly secrets list | grep SHOPIFY

# Verify redirect URLs in Partners Dashboard match:
# https://your-app-name.fly.dev/api/auth/callback

# Check logs for auth errors
fly logs | grep -i "auth\|oauth\|shopify"
```

#### 4. Webhooks Not Working

**Symptoms**: No webhook logs, data not syncing

**Solutions**:
```bash
# Test webhook endpoint manually
curl -X POST https://your-app-name.fly.dev/api/webhooks

# Check webhook URL in Shopify Partners Dashboard
# Should be: https://your-app-name.fly.dev/api/webhooks

# Monitor webhook delivery in logs
fly logs | grep webhook
```

### Health Monitoring

1. **Set up monitoring**:
   ```bash
   # Fly.io provides built-in monitoring
   fly dashboard
   ```

2. **Custom health checks** (already configured in fly.toml):
   - Endpoint: `/health`
   - Interval: 10s
   - Timeout: 5s

3. **Performance metrics to monitor**:
   - Response time < 500ms
   - Error rate < 1%
   - Memory usage < 80%
   - Database connection pool health

---

## 8. DNS & Custom Domain (Optional)

If you want to use a custom domain instead of `.fly.dev`:

1. **Add custom domain**:
   ```bash
   fly certs create yourdomain.com
   ```

2. **Update DNS records**:
   - Add CNAME record pointing to `your-app-name.fly.dev`

3. **Update environment variables**:
   ```bash
   fly secrets set HOST="https://yourdomain.com"
   ```

4. **Update Shopify app URLs** in Partners Dashboard

---

## 9. Scaling & Performance

### Auto-scaling Configuration

The app is configured for auto-scaling in `fly.toml`:

```toml
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
```

### Manual Scaling

If you need more resources:

```bash
# Scale to 2 instances
fly scale count 2

# Upgrade machine type
fly machine update --vm-size shared-cpu-2x

# Check current configuration
fly scale show
```

---

## 10. Security Checklist

✅ **Environment Variables**: All secrets properly set in Fly.io secrets (not in code)
✅ **HTTPS**: Enforced by default on Fly.io
✅ **CSP Headers**: Configured for Shopify embedding
✅ **HMAC Verification**: Webhook signatures verified
✅ **Database**: Connection string secured in environment
✅ **Session Security**: Secure session cookies configured

---

## 11. Backup & Maintenance

### Database Backups

1. **If using Fly PostgreSQL**:
   ```bash
   fly postgres backup list -a brandsight-db
   ```

2. **If using Neon**: Backups are automatic

### Application Updates

```bash
# Deploy new version
git push  # if using Git integration
# OR
fly deploy

# Check deployment status
fly status

# Rollback if needed
fly releases
fly rollback
```

---

## Support & Next Steps

### If You Encounter Issues

1. **Check logs first**: `fly logs`
2. **Verify environment variables**: `fly secrets list`
3. **Test components individually**: Database, Shopify auth, webhooks
4. **Reference this guide**: Most issues are covered in troubleshooting section

### After Successful Deployment

1. **Test thoroughly** in a development store
2. **Monitor performance** for the first few days
3. **Update any hardcoded URLs** in your codebase
4. **Consider setting up alerts** for critical metrics

### Shopify App Store Submission

Once everything is working:
1. Test in multiple stores
2. Complete Shopify's app review requirements
3. Submit for App Store approval
4. Monitor post-launch performance

---

## Quick Reference Commands

```bash
# Deploy app
fly deploy

# View logs
fly logs --follow

# Set environment variable
fly secrets set VARIABLE_NAME="value"

# Check app status
fly status

# Open app in browser
fly open

# SSH into app
fly ssh console

# Check machine resources
fly vm status

# Scale app
fly scale count 2
```

Your BrandSight app is now ready for production on Fly.io! 🚀

The migration resolves the Shopify iframe embedding issues you were experiencing on Replit while maintaining all existing functionality.