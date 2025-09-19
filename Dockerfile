# Use Node.js 20 Alpine as base image
FROM node:20-alpine AS base

# Install system dependencies for better compatibility
RUN apk add --no-cache libc6-compat dumb-init

# Set working directory
WORKDIR /app

# Create non-root user early
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Dependencies stage - install production dependencies only
FROM base AS deps

# Copy package files for better layer caching
COPY package*.json ./

# Install production dependencies only and clean up
RUN npm ci --only=production --prefer-offline && \
    npm cache clean --force && \
    rm -rf /tmp/* /root/.npm

# Builder stage - build the application
FROM base AS builder

# Copy package files and install all dependencies (including devDependencies)
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --prefer-offline

# Copy configuration files first (for better caching)
COPY vite.config.ts postcss.config.js tailwind.config.ts components.json ./
COPY drizzle.config.ts ./

# Copy source code
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/

# Build the application with optimized settings
ENV NODE_ENV=production
ENV VITE_NODE_ENV=production
RUN npm run build && \
    # Remove source maps in production for smaller size
    find dist/ -name "*.map" -delete && \
    # Clean up unnecessary files
    rm -rf client/ server/ shared/ node_modules/.cache

# Production image - minimal runtime
FROM base AS runner

# Copy production node_modules from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy the built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Copy only essential runtime configuration files
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/shopify.app.toml ./

# Switch to non-root user
USER nextjs

# Expose port 8080 (Fly.io standard)
EXPOSE 8080

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

# Optimized health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/index.js"]