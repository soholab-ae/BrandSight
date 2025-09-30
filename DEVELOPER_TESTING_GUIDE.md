# BrandSight - Developer Testing Guide

## Understanding Shopify Embedded App Authentication

### The Issue Your Developer is Facing

**Error:** `Refused to frame 'https://accounts.shopify.com/'`

**Why it happens:** Shopify's OAuth pages cannot be embedded in iframes due to Content Security Policy. This is **expected and by design** for security.

---

## Correct Testing Workflow

### Option 1: Test as Standalone (Recommended for Development)

**When to use:** Development and initial testing

**Steps:**
1. **Access app directly** (not through Shopify Admin):
   ```
   https://your-app-domain.com
   ```

2. **The app will detect it's NOT embedded** and show:
   - Landing page with "Connect your Store" button OR
   - Demo mode with sample data

3. **Click "Connect your Store":**
   - OAuth flow works normally (no iframe restrictions)
   - Redirects to Shopify for authorization
   - Returns to your app with access token
   - Data syncs and dashboard loads

**This workflow bypasses the CSP issue entirely.**

---

### Option 2: Test Embedded in Shopify Admin (Production-like)

**When to use:** Final testing before submission

**Prerequisites:**
- App must be configured in Shopify Partner Dashboard
- App must be installed on a development store
- Environment variables must be properly set:
  ```bash
  SHOPIFY_API_KEY=your_key
  SHOPIFY_API_SECRET=your_secret
  HOST=https://your-deployed-app.com
  ```

**Steps:**

1. **Install app on development store:**
   - Go to Shopify Partner Dashboard
   - Navigate to your app
   - Click "Test on development store"
   - Select a development store
   - Click "Install" (this handles OAuth)

2. **Access through Shopify Admin:**
   ```
   https://your-store.myshopify.com/admin/apps/your-app
   ```

3. **App loads embedded with session tokens:**
   - No manual OAuth needed (already done during install)
   - App Bridge handles authentication
   - Dashboard loads with store data

---

## Two Authentication Modes

BrandSight supports **dual authentication** to work in both scenarios:

### 1. Session Token Authentication (Embedded Mode)
- **Used when:** App is embedded in Shopify Admin
- **How it works:** App Bridge provides session tokens
- **Headers sent:** `Authorization: Bearer <session_token>`
- **Backend validates:** Token using SHOPIFY_API_SECRET

### 2. OAuth Authentication (Standalone Mode)  
- **Used when:** App accessed directly
- **How it works:** Standard OAuth 2.0 flow
- **User clicks:** "Connect your Store" button
- **Redirects to:** Shopify OAuth → callback → app

---

## Testing Scenarios

### Scenario 1: First Time User (Standalone)
```
User Journey:
1. Visit app URL directly
2. See landing page or demo mode
3. Click "Connect your Store"
4. OAuth to Shopify (popup or redirect)
5. Grant permissions
6. Return to app → dashboard loads
```

**Expected:** Works perfectly, no CSP errors

---

### Scenario 2: Returning User (Standalone)
```
User Journey:
1. Visit app URL directly
2. App detects existing connection
3. Dashboard loads immediately with data
```

**Expected:** Skip setup, go straight to dashboard

---

### Scenario 3: Embedded in Shopify (After Install)
```
User Journey:
1. Access from Shopify Admin apps menu
2. App loads in iframe
3. App Bridge provides session token
4. Dashboard loads with store data
```

**Expected:** Works seamlessly, no OAuth needed

---

## Common Mistakes and Solutions

### ❌ Mistake 1: Trying to OAuth Inside Iframe

**Don't do this:**
- Click "Connect your Store" when embedded
- Try to redirect to OAuth from inside iframe

**Why it fails:** CSP blocks iframe redirects to accounts.shopify.com

**Solution:** OAuth must happen:
- During app installation (handled by Shopify)
- OR when accessing standalone (outside iframe)

---

### ❌ Mistake 2: Missing Environment Variables

**Symptoms:**
- App doesn't load embedded
- Session tokens fail validation
- "Unauthorized" errors

**Check these variables:**
```bash
SHOPIFY_API_KEY=<your_api_key>
SHOPIFY_API_SECRET=<your_api_secret>
HOST=<your_deployed_url>
SCOPES=read_products,read_orders,read_customers
USE_SHOPIFY_AUTH=true
```

**Solution:** Set all required environment variables before testing embedded mode

---

### ❌ Mistake 3: Testing Embedded Before Installation

**Symptoms:**
- Blank dashboard
- CSP errors
- No data loads

**The issue:** App not installed on store yet

**Solution:** Install app via Partner Dashboard first, THEN test embedded access

---

## Step-by-Step: Proper Testing Order

### Phase 1: Standalone Development Testing

1. **Set up development database:**
   ```bash
   # Create PostgreSQL database
   DATABASE_URL=postgresql://user:pass@host/db
   ```

2. **Set minimal environment variables:**
   ```bash
   DATABASE_URL=<your_postgres_url>
   NODE_ENV=development
   PORT=5000
   ```

3. **Start app:**
   ```bash
   npm install
   npm run dev
   ```

4. **Access standalone:**
   ```
   http://localhost:5000
   ```

5. **Test demo mode:**
   - Should see demo data without connecting store
   - All Phase 1 features should work

6. **Test OAuth (optional):**
   - Add Shopify credentials to .env
   - Click "Connect your Store"
   - Complete OAuth flow
   - Verify data sync

---

### Phase 2: Embedded Production Testing

1. **Deploy to production hosting:**
   - Deploy to cloud (Fly.io, AWS, etc.)
   - Set up DATABASE_URL in production
   - Configure all environment variables

2. **Configure in Shopify Partner Dashboard:**
   - Create app listing
   - Set App URL: `https://your-app.com`
   - Set Redirect URL: `https://your-app.com/api/auth/callback`
   - Get API key and secret

3. **Update production environment:**
   ```bash
   SHOPIFY_API_KEY=<from_partner_dashboard>
   SHOPIFY_API_SECRET=<from_partner_dashboard>
   HOST=https://your-app.com
   SCOPES=read_products,read_orders,read_customers
   USE_SHOPIFY_AUTH=true
   ```

4. **Install on development store:**
   - Partner Dashboard → Apps → Test on development store
   - Complete installation (OAuth happens here)

5. **Access embedded:**
   - Go to Shopify Admin
   - Apps → Your App
   - Dashboard should load in iframe

---

## Demo Mode vs Real Store

### Demo Mode
- **Triggers when:** No Shopify store connected
- **Shows:** Sample data (5 brands, 250+ orders)
- **Allows:** Full feature testing without Shopify account
- **Perfect for:** Developer evaluation and pricing

### Real Store Mode
- **Triggers when:** Store authenticated and connected
- **Shows:** Actual store data from Shopify
- **Syncs:** Products, orders, customers, vendors
- **Perfect for:** Production testing and real merchant use

---

## Debugging Tips

### Check if App is Embedded

**Frontend Console:**
```javascript
// Open browser console
console.log('Is Embedded:', window.location !== window.parent.location);
console.log('Referrer:', document.referrer);
```

**Expected:** 
- Embedded: `true` + referrer includes `admin.shopify.com`
- Standalone: `false` + no admin referrer

---

### Check Authentication Method

**Network Tab (Browser DevTools):**

**Session Token (Embedded):**
```
Request Headers:
  Authorization: Bearer eyJhbGc...
```

**Cookie Auth (Standalone):**
```
Request Headers:
  Cookie: session_id=...
```

---

### Check Backend Logs

**Look for these log messages:**
```
[AUTH] Found Authorization header, attempting session token validation
[SESSION_TOKEN] Successfully validated session token for shop: store.myshopify.com
```

---

## Summary for Your Developer

### ✅ What They Should Do:

1. **For Development:**
   - Test standalone first (direct URL access)
   - Use demo mode for feature testing
   - OAuth works normally outside iframe

2. **For Production Testing:**
   - Deploy app to cloud hosting
   - Configure in Partner Dashboard
   - Install on development store
   - THEN test embedded access

3. **Never try to OAuth inside iframe**
   - That CSP error is expected
   - OAuth happens during installation
   - Embedded mode uses session tokens

### ✅ The Error is Normal:

The CSP error your developer saw is **not a bug** - it's Shopify's security working as intended. The app is designed to handle both embedded and standalone contexts correctly.

### ✅ Testing Priority:

```
1. Standalone access → Demo mode ✓
2. Standalone access → OAuth → Real data ✓
3. Production deployment → Install → Embedded access ✓
```

---

## Quick Reference

| Scenario | Access Method | Auth Type | OAuth Location | Works? |
|----------|---------------|-----------|----------------|--------|
| Dev Standalone | Direct URL | Cookie | In-app redirect | ✅ Yes |
| Dev Embedded | Try OAuth in iframe | Session Token | CSP blocks | ❌ Expected Error |
| Prod Embedded (After Install) | Shopify Admin | Session Token | Already done at install | ✅ Yes |
| Demo Mode | Direct URL | None | N/A | ✅ Yes |

---

## Contact for Support

If your developer still encounters issues after following this guide, provide:
1. Which testing scenario they're attempting
2. Whether app is deployed or local
3. Full error message and browser console logs
4. Whether they've installed the app via Partner Dashboard

This will help diagnose the specific issue quickly.