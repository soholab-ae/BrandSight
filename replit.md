# Overview

BrandSight is a comprehensive Shopify analytics application that provides deep brand-specific insights that standard Shopify analytics don't offer. The app allows store owners to analyze performance metrics by brand and vendor, including Average Order Value (AOV), conversion rates, visitor metrics, and revenue analytics across different product brands. Users can connect their Shopify stores to sync product and order data, then view detailed dashboards with brand comparisons, top products, landing page analytics, and customizable date ranges.

## Recent Updates (October 17, 2025)
- **MAJOR: Production-Ready Remix App Complete**: Full Shopify analytics app in `brandsight-remix/` directory
- **Official Stack**: Remix + Polaris framework with complete analytics features
- **All Core Features Built**: Vendor analytics, product performance, customer loyalty, smart alerts
- **Complete Database Schema**: 20+ Prisma tables with safe dual-session approach
- **Shopify Data Sync**: GraphQL API integration with cursor-based pagination
- **Deployment Ready**: Complete Render deployment guide for self-deployment
- **No Demo Mode**: Production-only app - connects to real Shopify store data

## Legacy App Status (Original React + Tailwind - DEPRECATED)
- Authentication vulnerabilities, not using official Shopify stack
- Should not be used for production deployments
- Kept for reference only

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## New Remix + Polaris Architecture (brandsight-remix/)
The application is being rebuilt using Shopify's official recommended stack:

- **Framework**: Remix 2.14 - Full-stack React framework with server-side rendering
- **UI Library**: Shopify Polaris 13.9 - Official Shopify design system
- **Authentication**: `@shopify/shopify-app-remix` - Built-in OAuth and session token management
- **Database**: Prisma 5.20 with Neon PostgreSQL - Type-safe ORM
- **App Bridge**: Shopify App Bridge 3.x - Embedded app integration
- **Routing**: File-based routing with Remix loaders and actions
- **Data Fetching**: Server-side loaders with automatic client hydration
- **Deployment**: Render (production) with Neon serverless PostgreSQL

### Key Benefits
- ✅ Official Shopify support and maintained templates
- ✅ Production-ready authentication with session tokens
- ✅ Polaris components match Shopify Admin perfectly
- ✅ Better security (no custom auth vulnerabilities)
- ✅ Server-side rendering for faster initial loads
- ✅ Type-safe database operations with Prisma
- ✅ Future-proof architecture aligned with Shopify roadmap

## Legacy Architecture (Current React + Express App)
The original application uses a modern full-stack architecture with a React frontend and Express backend. The frontend is built with Vite for fast development and optimized builds, while the backend serves both API routes and static assets. The architecture follows a monorepo structure with shared TypeScript types between frontend and backend.

**Note**: This legacy app remains functional for reference but has known authentication security issues and does not use Shopify's official stack.

## Frontend Architecture
- **React with TypeScript**: Component-based architecture using React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS for utility-first styling with shadcn/ui component library for consistent UI patterns
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite with custom configuration for development and production builds

## Backend Architecture
- **Express.js Server**: RESTful API with Express serving both API endpoints and static assets
- **Authentication**: OpenID Connect (OIDC) integration with Replit's authentication system using Passport.js
- **Session Management**: Express sessions with PostgreSQL session storage using connect-pg-simple
- **Request Handling**: Structured routing with middleware for authentication, error handling, and request logging

## Database Architecture
- **PostgreSQL with Drizzle ORM**: Type-safe database operations with schema-first approach
- **Database Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema Design**: Relational schema with tables for users, stores, vendors, products, orders, and analytics data
- **Session Storage**: Dedicated sessions table for authentication state persistence (used for both Replit OIDC and Shopify OAuth sessions)
- **Custom Shopify Session Storage**: PostgreSQLSessionStorage implementation for persistent Shopify session management

## Authentication & Authorization
- **Replit OIDC Integration**: Seamless authentication flow using Replit's identity provider
- **Session-Based Authentication**: Server-side sessions with secure cookie management
- **Route Protection**: Middleware-based authentication checks for protected API routes
- **User Context**: User information available throughout the application via authentication middleware

## External Service Integration
- **Shopify API Integration**: Custom service for syncing products and orders from connected Shopify stores
- **Data Synchronization**: Automated sync processes for keeping vendor analytics up to date
- **API Rate Limiting**: Proper handling of Shopify API rate limits and error responses

## Data Processing
- **Analytics Aggregation**: Server-side processing of order and product data to generate vendor-specific metrics
- **Real-time Updates**: Periodic synchronization with Shopify stores to maintain current data
- **Performance Optimization**: Efficient queries and data structures for dashboard performance

## Development Workflow
- **TypeScript Configuration**: Shared types between frontend and backend with strict type checking
- **Development Server**: Hot reload for both frontend and backend development
- **Build Process**: Optimized production builds with asset bundling and code splitting
- **Environment Management**: Configuration-based setup for different deployment environments

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database for production data storage
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## Authentication Services
- **Replit OIDC**: Primary authentication provider for user management
- **openid-client**: OpenID Connect client library for authentication flows

## Third-Party APIs
- **Shopify Admin API**: Integration for syncing store data, products, and orders
- **Shopify Webhooks**: Real-time updates for store changes (planned integration)

## Frontend Libraries
- **Radix UI Primitives**: Accessible UI component primitives (@radix-ui/react-*)
- **TanStack Query**: Server state management and data fetching
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library built on Radix UI

## Backend Libraries
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Express.js**: Web application framework
- **Passport.js**: Authentication middleware
- **ws**: WebSocket library for Neon database connections

## Development Tools
- **Vite**: Frontend build tool with React plugin
- **TypeScript**: Static type checking for entire codebase
- **ESBuild**: Fast JavaScript bundling for production builds
- **PostCSS & Autoprefixer**: CSS processing and vendor prefixing