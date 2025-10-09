# BrandSight - Initial Requirements Document

## Executive Summary

**App Name:** BrandSight  
**Platform:** Shopify Public App  
**Category:** Analytics & Reporting  
**Target Users:** Shopify store owners with multiple brands/vendors  
**Core Value Proposition:** Brand-specific analytics that standard Shopify analytics don't provide

---

## 1. App Overview

### 1.1 Purpose
BrandSight provides deep brand and vendor-specific insights for Shopify stores, enabling merchants to:
- Track performance by brand/vendor
- Compare brand metrics (AOV, conversion rates, revenue)
- Analyze customer brand loyalty and purchasing patterns
- Monitor inventory levels by brand
- Forecast future sales by vendor
- Receive automated alerts for performance changes

### 1.2 Business Model
- **Subscription-based pricing** with three tiers:
  - **Starter Plan:** $49/month - Basic vendor analytics
  - **Growth Plan:** $99/month - Advanced features + Smart Alerts
  - **Scale Plan:** $199/month - All features + Priority Support
- Billing through Shopify's billing API

---

## 2. Core Features

### 2.1 Vendor/Brand Performance Analytics
**Purpose:** Track and compare vendor performance across key metrics

**Requirements:**
- Display vendor metrics in paginated table format
- Support sorting by: Revenue, AOV, Conversion Rate, Growth Rate
- Search/filter by vendor name
- Show metrics:
  - Total Revenue
  - Average Order Value (AOV)
  - Conversion Rate (%)
  - Visitor Count
  - Product Count
  - Growth Rate (%)
- Export data in CSV and Excel formats
- Date range filtering (7 days, 30 days, 90 days, custom)

### 2.2 Sales Analytics
**Purpose:** Deep-dive into sales patterns by brand

**Requirements:**
- Revenue trends over time (line charts)
- Brand comparison charts (bar charts)
- Top-selling products by brand
- Landing page performance by vendor
- Order distribution by brand
- Sales velocity metrics

### 2.3 Customer Brand Loyalty Analytics
**Purpose:** Understand customer purchasing patterns across brands

**Requirements:**
- **Brand Affinity Score:** Calculate customer preference for specific brands
  - Formula: (Brand Purchases / Total Purchases) × Average Order Value
- **Cross-Brand Purchase Analysis:** Track customers buying from multiple brands
- **Loyalty Segments:**
  - Single-brand loyalists
  - Multi-brand shoppers
  - Brand switchers
- **Repeat Purchase Rate** by brand
- **Customer Lifetime Value (CLV)** by brand preference

### 2.4 Smart Alerts System
**Purpose:** Proactive notifications for performance changes

**Requirements:**
- **Alert Types:**
  - Performance Drop: Revenue decline > threshold
  - Performance Spike: Sudden revenue increase
  - Inventory Low: Stock below threshold
  - Sales Trend: Consistent growth/decline pattern

- **Alert Configuration:**
  - Set custom thresholds (percentage or absolute values)
  - Choose severity levels (Low, Medium, High)
  - Configure monitoring timeframe
  - Enable/disable specific alerts

- **Notification Methods:**
  - In-app notification center
  - Email notifications
  - Dashboard badge indicators

### 2.5 Inventory Intelligence
**Purpose:** Monitor stock levels and predict stockouts by brand

**Requirements:**
- Current inventory levels by vendor
- Stock velocity tracking
- Low stock alerts (customizable thresholds)
- Stockout predictions based on sales velocity
- Inventory turnover rate by brand
- Restock recommendations with suggested quantities
- Lead time tracking per vendor

### 2.6 Predictive Forecasting
**Purpose:** AI-driven sales predictions by brand

**Requirements:**
- **30-day revenue forecast** by vendor
- **Prediction confidence scores** (based on historical data quality)
- **Seasonal pattern detection**
- **Trend analysis:**
  - Identify growing brands
  - Detect declining brands
  - Spot seasonal patterns
- **Accuracy tracking:** Compare predictions vs actual results
- **Historical forecast performance** metrics

### 2.7 Product Performance
**Purpose:** Track individual product success by brand

**Requirements:**
- Product listing with vendor grouping
- Metrics per product:
  - Units sold
  - Revenue generated
  - Average price
  - Stock status
- Top products by brand
- Underperforming product identification
- Product comparison across vendors

### 2.8 Reports & Data Export
**Purpose:** Generate comprehensive reports for analysis

**Requirements:**
- **Export Formats:**
  - CSV (for spreadsheet analysis)
  - Excel (with multiple sheets and formatting)
  - PDF (formatted reports with charts) [Planned]

- **Report Types:**
  - Vendor performance summary
  - Sales analytics report
  - Customer loyalty report
  - Inventory status report

- **Export Options:**
  - Filtered data export
  - Custom date ranges
  - Selected vendors only
  - Streaming exports for large datasets

---

## 3. Technical Requirements

### 3.1 Shopify Integration

#### 3.1.1 Authentication & Authorization
- **OAuth 2.0 Flow:** Standard Shopify app installation
- **Session Token Authentication:** For embedded app (App Bridge)
- **Token Exchange:** Modern approach for obtaining access tokens
- **Required Scopes:**
  ```
  read_products, write_products,
  read_orders, 
  read_customers,
  read_inventory,
  write_script_tags (for tracking)
  ```

#### 3.1.2 Data Synchronization
- **Initial Sync:** Import all historical products and orders
- **Webhook Subscriptions:**
  - `orders/create` - New order processing
  - `orders/updated` - Order status changes
  - `products/create` - New product addition
  - `products/update` - Product changes
  - `customers/create` - New customer tracking
  - `app/uninstalled` - Cleanup on uninstall
  - **GDPR Webhooks (Mandatory):**
    - `customers/data_request`
    - `customers/redact`
    - `shop/redact`

#### 3.1.3 App Bridge Integration
- Embedded app support
- Navigation within Shopify admin
- Loading states and error handling
- Session token management

### 3.2 Database Architecture

#### 3.2.1 Core Tables
- **users:** User accounts (from Shopify OAuth)
- **stores:** Connected Shopify stores
- **vendors:** Brand/vendor master data
- **products:** Product catalog with vendor mapping
- **orders:** Transaction records
- **order_line_items:** Order details with product links
- **inventory:** Real-time stock levels

#### 3.2.2 Analytics Tables
- **vendor_analytics:** Aggregated vendor metrics
- **page_analytics:** Landing page performance
- **customer_brand_affinity:** Loyalty scores
- **customer_cross_brand_purchases:** Multi-brand behavior
- **inventory_analytics:** Stock movement data
- **vendor_inventory_summary:** Inventory by vendor
- **sales_forecasts:** Prediction data
- **forecast_accuracy:** Model performance tracking

#### 3.2.3 Feature Tables
- **alerts:** Active alert instances
- **alert_rules:** Alert configuration
- **notifications:** Notification queue
- **notification_preferences:** User notification settings
- **email_queue:** Pending emails
- **sessions:** PostgreSQL-based session storage

### 3.3 Technology Stack

#### 3.3.1 Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** Wouter (lightweight)
- **State Management:** TanStack Query (React Query v5)
- **UI Components:** shadcn/ui with Radix UI primitives
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **App Bridge:** Shopify App Bridge 3.x

#### 3.3.2 Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Drizzle ORM
- **Authentication:** Shopify OAuth + Session Tokens
- **Session Storage:** PostgreSQL (custom implementation)

#### 3.3.3 External Services
- **Email:** Nodemailer (SMTP)
- **Shopify API:** Admin API v2024-10

---

## 4. User Flows

### 4.1 Installation & Setup Flow
```
1. Merchant finds app in Shopify App Store
2. Clicks "Install App"
3. Shopify OAuth consent screen
4. Merchant approves permissions
5. OAuth callback processes installation
6. Initial data sync begins (products, orders)
7. User redirected to dashboard
8. Dashboard shows demo data until sync completes
9. Sync progress indicator displayed
10. Real data appears when sync finishes
```

### 4.2 Daily Usage Flow
```
1. Merchant accesses app from Shopify admin
2. App loads embedded in Shopify (with App Bridge)
3. Session token validates authentication
4. Dashboard displays:
   - Key metrics summary
   - Recent alerts
   - Top vendors
   - Performance trends
5. Merchant navigates to specific analytics pages
6. Views detailed reports
7. Exports data if needed
8. Configures alerts for monitoring
```

### 4.3 Alert Configuration Flow
```
1. Navigate to Alerts page
2. Click "Create Alert Rule"
3. Configure:
   - Alert type (performance drop, spike, etc.)
   - Vendor selection
   - Threshold values
   - Severity level
   - Notification preferences
4. Save alert rule
5. System monitors conditions
6. Alert triggered when conditions met
7. Notification sent (in-app + email)
8. Merchant reviews and takes action
```

---

## 5. Business Logic & Calculations

### 5.1 Metrics Calculations

#### Average Order Value (AOV)
```
AOV = Total Revenue / Number of Orders
```

#### Conversion Rate
```
Conversion Rate = (Orders / Visitors) × 100
```

#### Growth Rate
```
Growth Rate = ((Current Period Revenue - Previous Period Revenue) / Previous Period Revenue) × 100
```

#### Brand Affinity Score
```
Affinity Score = (Brand Orders / Total Orders) × Average Brand Order Value
```

#### Inventory Turnover
```
Turnover Rate = Units Sold / Average Inventory
```

### 5.2 Forecasting Algorithm
- **Method:** Time series analysis with seasonal decomposition
- **Inputs:** Historical sales data (minimum 30 days)
- **Outputs:** 30-day revenue prediction with confidence interval
- **Factors Considered:**
  - Historical trends
  - Seasonal patterns
  - Recent performance
  - Stock availability

### 5.3 Alert Triggering Logic

**Performance Drop Alert:**
```
Trigger if:
  Current Period Revenue < Previous Period Revenue × (1 - Threshold%)
  AND decline persists for configured timeframe
```

**Low Inventory Alert:**
```
Trigger if:
  Current Stock < Threshold Quantity
  OR Days Until Stockout < Warning Days
```

---

## 6. Data Privacy & Compliance

### 6.1 GDPR Compliance
- **Customer Data Requests:** Export all customer data on request
- **Customer Data Deletion:** Remove all customer PII on request
- **Shop Data Deletion:** Complete data removal on app uninstall

### 6.2 Data Retention
- **Active Stores:** Retain all data while app installed
- **Uninstalled Apps:** 30-day grace period, then full deletion
- **GDPR Requests:** Immediate processing (48-hour SLA)

### 6.3 Security Measures
- **Session Management:** PostgreSQL-based secure sessions
- **Token Handling:** Never expose access tokens client-side
- **Encryption:** TLS/SSL for all communications
- **Secret Management:** Environment-based configuration

---

## 7. Performance Requirements

### 7.1 Response Times
- **Dashboard Load:** < 2 seconds
- **Data Export:** Stream large datasets (no timeout)
- **API Requests:** < 500ms for cached data
- **Sync Operations:** Background jobs, non-blocking

### 7.2 Scalability
- **Concurrent Users:** Support 1000+ stores
- **Data Volume:** Handle stores with 100k+ products
- **Query Optimization:** Indexed database queries
- **Caching Strategy:** Redis/in-memory for frequently accessed data

### 7.3 Reliability
- **Uptime Target:** 99.9%
- **Error Handling:** Graceful degradation
- **Webhook Processing:** Retry logic with exponential backoff
- **Data Backup:** Daily automated backups

---

## 8. Demo Mode

### 8.1 Purpose
Allow users to explore the app without Shopify store connection

### 8.2 Demo Data
- **5 Athletic Brands:** Nike, Adidas, Under Armour, Puma, New Balance
- **250+ Sample Orders:** Realistic transaction data
- **Product Catalog:** 50+ demo products
- **Analytics:** Pre-calculated metrics and trends
- **Alerts:** Sample alert configurations

### 8.3 Demo Mode Activation
```
Conditions for Demo Mode:
- No Shopify store connected
- Not in embedded/iframe context
- No shop parameter in URL
```

---

## 9. Future Enhancements (Roadmap)

### Phase 2 Features
- Multi-store management (single dashboard for multiple shops)
- Custom report builder with drag-and-drop
- Advanced forecasting with ML models
- Competitor benchmarking
- Automated reordering integration
- Brand performance scoring system

### Phase 3 Features
- Mobile app (iOS/Android)
- API for third-party integrations
- White-label options for agencies
- Advanced segmentation (RFM analysis)
- Profitability analysis by brand

---

## 10. Support Requirements

### 10.1 Documentation
- **User Guide:** Comprehensive feature documentation
- **Video Tutorials:** Step-by-step walkthroughs
- **FAQ Section:** Common questions and answers
- **API Documentation:** For developers/integrations

### 10.2 Support Channels
- **Email Support:** support@brandsight.app
- **In-App Help:** Contextual help tooltips
- **Knowledge Base:** Self-service articles
- **Priority Support:** Scale plan customers (24-hour response)

---

## 11. Success Metrics

### 11.1 User Engagement
- Daily Active Users (DAU)
- Feature adoption rates
- Time spent in app
- Export frequency

### 11.2 Business Metrics
- Monthly Recurring Revenue (MRR)
- Churn rate (target < 5%)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)

### 11.3 Technical Metrics
- API response times
- Error rates
- Sync success rate
- Webhook delivery rate

---

## Document Version
- **Version:** 1.0
- **Date:** October 9, 2025
- **Prepared For:** Developer Team
- **Status:** Initial Requirements

---

## Appendix A: Current Implementation Status

### ✅ Completed Features
- Vendor Performance Analytics
- Sales Analytics Dashboard
- Customer Brand Loyalty Analytics
- Smart Alerts System
- Inventory Intelligence
- Predictive Forecasting
- Product Performance Tracking
- Reports & Data Export
- Demo Mode
- Shopify OAuth Integration
- Webhook Handlers (GDPR compliant)
- PostgreSQL Database Schema
- Frontend UI (React + Tailwind)
- Subscription Billing Integration

### ⚠️ Known Issues (Requires Attention)
- **Authentication Flow:** Needs modernization to use session tokens exclusively
- **App Bridge Integration:** Requires proper session token handling
- **Token Management:** Online vs offline token strategy needs refinement
- **Security Hardening:** Demo mode access controls need strengthening

### 🔄 In Progress
- Modern session token authentication implementation
- App Bridge 3.x integration improvements
- Security vulnerability fixes

---

## Appendix B: Environment Variables Required

```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_products,write_products,read_orders,read_customers,read_inventory
HOST=https://your-app-url.replit.app

# Database
DATABASE_URL=postgresql://...

# Authentication
USE_SHOPIFY_AUTH=true

# Email Service (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# Feature Flags
VITE_SHOPIFY_API_KEY=your_api_key (for frontend)
```

---

## Contact & Questions

For clarifications or additional requirements, please contact the development team.
