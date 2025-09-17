import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
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

// Only add root health check in development to avoid intercepting SPA in production
if (app.get('env') === 'development') {
  app.get('/', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running in development' });
  });
}

// Ensure static directory exists for production
function ensureStaticDir() {
  const expectedPath = path.resolve(import.meta.dirname, 'public');
  
  if (fs.existsSync(expectedPath)) {
    return; // Already exists, nothing to do
  }
  
  // Try to find the actual build directory
  const candidates = [
    path.resolve(import.meta.dirname, 'dist', 'public'),
    path.resolve(import.meta.dirname, '..', 'client', 'dist'),
    path.resolve(import.meta.dirname, '..', 'dist', 'public')
  ];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        // Create symlink to the found build directory
        fs.symlinkSync(candidate, expectedPath, 'junction');
        log(`Created symlink: ${expectedPath} -> ${candidate}`);
        return;
      } catch (error) {
        log(`Failed to create symlink: ${error}`);
        // If symlink fails, we'll handle this in the static serving section
        break;
      }
    }
  }
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
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Ensure static directory exists before serving
    ensureStaticDir();
    serveStatic(app);
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
