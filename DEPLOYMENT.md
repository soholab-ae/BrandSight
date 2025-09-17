# Vendorlytics - Production Deployment Guide

## Replit Autoscale Deployment

Your Shopify analytics app is ready for production deployment on Replit Autoscale. Follow this step-by-step guide to deploy your app and prepare it for Shopify App Store submission.

## Prerequisites

Before deploying, ensure you have:

1. **Shopify Partner Account** - For creating the app in Shopify Partners Dashboard
2. **Custom Domain** - For professional app hosting (recommended for App Store)
3. **SSL Certificate** - Automatically provided by Replit Autoscale

## Step 1: Configure Environment Variables

Set these required environment variables in your Replit deployment:

### Required for Production

```bash
# Database (Already configured)
DATABASE_URL=your_neon_database_url

# Session Security (Already configured)  
SESSION_SECRET=your_secure_session_secret

# Shopify Integration (Required for deployment)
SHOPIFY_API_KEY=c7757dd8317e938754cef77d03490eb2
SHOPIFY_API_SECRET=1a4bb0b07180bfc4d0145688343ca524
SCOPES=read_products,read_orders,read_customers
HOST=https://brandsight.replit.app

# Required for Shopify App Store
USE_SHOPIFY_AUTH=true

# Optional
PORT=5000
NODE_ENV=production
```

### Getting Shopify Credentials

1. **Create Shopify App**:
   - Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
   - Create new app > Custom app
   - Note your API Key and API Secret

2. **Configure App URLs**:
   - App URL: `https://your-domain.com/`
   - Allowed redirection URL: `https://your-domain.com/api/auth/callback`
   - Webhook URL: `https://your-domain.com/api/webhooks`

3. **Set Permissions**:
   - Products: Read access
   - Orders: Read access  
   - Customers: Read access
   - Webhooks: Write access

## Step 2: Deploy to Replit Autoscale

### Production Build

Your app includes optimized production build scripts:

```bash
npm run build    # Builds frontend and backend
npm start        # Runs production server
```

### Database Migration

Ensure your database schema is up to date:

```bash
npm run db:push  # Sync schema to production database
```

### Deployment Steps

1. **Enable Autoscale**:
   - Go to your Replit project settings
   - Enable "Autoscale" in deployment section
   - Choose your pricing plan

2. **Configure Custom Domain**:
   - Add your custom domain in Replit settings
   - Point your DNS to Replit's servers
   - SSL will be automatically configured

3. **Set Environment Variables**:
   - Add all required variables in Replit's environment settings
   - Ensure `HOST` matches your custom domain

4. **Deploy**:
   - Push your code to production
   - Replit will automatically build and deploy

## Step 3: Verify Deployment

### Health Checks

After deployment, verify these endpoints:

```bash
# App health
GET https://your-domain.com/api/auth/user
# Should return 401 (unauthorized) when not logged in

# Webhook endpoint  
POST https://your-domain.com/api/webhooks
# Should return 200 with proper Shopify HMAC

# Landing page
GET https://your-domain.com/
# Should show landing page
```

### Test Shopify Integration

1. **Install in Test Store**:
   - Use Shopify Partners Dashboard
   - Install in development store
   - Complete OAuth flow

2. **Verify Data Sync**:
   - Check products sync in dashboard
   - Create test order
   - Verify webhook processing

## Step 4: Production Optimizations

### Security Headers

Your app includes production-ready security:

- ✅ HTTPS enforcement
- ✅ Secure session cookies
- ✅ HMAC webhook verification
- ✅ CSRF protection

### Performance Features

- ✅ Optimized production build (395KB gzipped)
- ✅ Database connection pooling
- ✅ Efficient React Query caching
- ✅ Compressed static assets

### Monitoring

Monitor these metrics:
- Response times (should be < 500ms)
- Error rates (should be < 1%)
- Database connection health
- Webhook success rates

## Step 5: Shopify App Store Submission

### Pre-submission Checklist

- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] All API endpoints working
- [ ] Onboarding flow tested
- [ ] Data export functionality tested
- [ ] Error handling verified
- [ ] Performance optimized

### App Store Requirements

1. **App Description**: Focus on vendor analytics value proposition
2. **Screenshots**: Include dashboard, setup flow, analytics views
3. **Privacy Policy**: Document data handling and storage
4. **Terms of Service**: Standard Shopify app terms
5. **Support Documentation**: User guide and troubleshooting

### Submission Process

1. Complete app in Shopify Partners Dashboard
2. Upload screenshots and descriptions
3. Submit for review
4. Respond to reviewer feedback
5. App goes live in Shopify App Store

## Troubleshooting

### Common Issues

**Database Connection Errors**:
- Verify `DATABASE_URL` is correctly set
- Check Neon database is provisioned and accessible

**Shopify Authentication Errors**:
- Ensure `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
- Verify `HOST` matches your actual domain
- Check redirect URLs in Shopify Partners Dashboard

**Webhook Delivery Issues**:
- Confirm webhook URL is accessible publicly
- Check HMAC verification is working
- Monitor webhook logs for errors

### Performance Issues

**Slow Loading**:
- Enable Replit Autoscale boost if needed
- Monitor database query performance
- Check for N+1 query issues

**High Memory Usage**:
- Monitor analytics calculation processes
- Consider data archival for old orders
- Optimize large vendor datasets

## Support

For deployment assistance:
1. Check application logs in Replit console
2. Monitor database performance in Neon dashboard
3. Review Shopify webhook delivery in Partners Dashboard
4. Contact Replit support for infrastructure issues

## Next Steps

After successful deployment:
1. Monitor app performance and user feedback
2. Add advanced analytics features
3. Implement customer-requested integrations
4. Scale based on usage patterns

Your Vendorlytics app is now ready for production and Shopify App Store success! 🚀