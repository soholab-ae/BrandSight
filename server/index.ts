import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const app = express();

// Apply JSON parsing to all routes EXCEPT webhooks (webhooks need raw body for HMAC verification)
app.use((req, res, next) => {
  if (req.path === '/api/webhooks') {
    // Skip JSON parsing for webhook endpoint
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Add CSP headers for Shopify embedded app to work in Firefox
app.use((req, res, next) => {
  // Get shop from various sources
  const shop = req.query.shop as string || 
               req.headers['x-shopify-shop'] as string ||
               process.env.DEFAULT_SHOP_DOMAIN;
  
  if (shop) {
    // Set Content-Security-Policy to allow embedding in Shopify admin
    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors https://${shop} https://admin.shopify.com;`
    );
  } else {
    // For non-embedded contexts, allow self
    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors 'self';`
    );
  }
  
  // Remove X-Frame-Options header as it conflicts with CSP
  res.removeHeader('X-Frame-Options');
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Health check endpoint - must come before route registration
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Diagnostic endpoint to verify static file serving (development only)
if (app.get('env') === 'development') {
  app.get('/__diag/static', (_req, res) => {
    const publicPath = path.resolve(import.meta.dirname, 'public');
    const assetsPath = path.resolve(publicPath, 'assets');
    
    res.json({
      staticPath: publicPath,
      assetsPath: assetsPath,
      publicExists: fs.existsSync(publicPath),
      assetsExists: fs.existsSync(assetsPath),
      assetCount: fs.existsSync(assetsPath) ? fs.readdirSync(assetsPath).length : 0,
      environment: app.get('env'),
      sampleAssets: fs.existsSync(assetsPath) ? fs.readdirSync(assetsPath).slice(0, 3) : []
    });
  });
}

// Only add root health check in development to avoid intercepting SPA in production
if (app.get('env') === 'development') {
  app.get('/', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running in development' });
  });
}

// Ensure static directory and assets exist for production
function ensureStaticDir() {
  const expectedPath = path.resolve(import.meta.dirname, 'public');
  const distPublicPath = path.resolve(import.meta.dirname, '..', 'dist', 'public');
  const distAssetsPath = path.resolve(distPublicPath, 'assets');
  
  // Always prefer dist/public if it exists with assets
  if (fs.existsSync(distAssetsPath)) {
    // Remove existing symlink/directory if it exists
    if (fs.existsSync(expectedPath)) {
      try {
        fs.rmSync(expectedPath, { recursive: true, force: true });
        log(`Removed existing server/public to use fresh dist/public`);
      } catch (error) {
        log(`Warning: Could not remove existing server/public: ${error}`);
      }
    }
    
    try {
      // Create fresh symlink to dist/public
      fs.symlinkSync(distPublicPath, expectedPath, 'junction');
      log(`Created symlink: ${expectedPath} -> ${distPublicPath}`);
      log(`Assets directory contains: ${fs.readdirSync(distAssetsPath).length} files`);
      return;
    } catch (error) {
      log(`Failed to create symlink: ${error}`);
    }
  }
  
  // Assets not found - this should not happen in production
  log(`Warning: Built assets not found at ${distAssetsPath}. Ensure 'npm run build' was run during deployment.`);
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  
  // Force production mode if we have built assets (published environment)
  const isProduction = app.get("env") === "production" || 
                       (app.get("env") === "development" && fs.existsSync(path.resolve(import.meta.dirname, '..', 'dist', 'public')));
  
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    // Ensure static directory exists before serving
    ensureStaticDir();
    serveStatic(app);
    log("Serving in production mode with static files");
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
