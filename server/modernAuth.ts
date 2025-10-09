import { Request, Response, NextFunction } from 'express';
import { validateSessionToken, getAccessToken } from './tokenExchange';
import { storage } from './storage';

/**
 * Modern Shopify authentication middleware using session tokens
 * This replaces the old OAuth-based authentication for embedded apps
 */
export async function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('[AUTH] Authenticating request:', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!req.headers.authorization,
      shop: req.query.shop || req.headers['x-shopify-shop-domain']
    });

    // Extract session token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AUTH] No Bearer token found in Authorization header');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing session token' 
      });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate session token
    const payload = await validateSessionToken(sessionToken);
    if (!payload) {
      console.log('[AUTH] Session token validation failed');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid session token' 
      });
    }

    const shop = payload.dest.replace('https://', '');
    console.log('[AUTH] Session token validated for shop:', shop);

    // Get or exchange for access token
    const result = await getAccessToken(sessionToken);
    if (!result) {
      console.log('[AUTH] Failed to get access token for shop:', shop);
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Failed to obtain access token' 
      });
    }

    // Attach shop and access token to request
    (req as any).shop = result.shop;
    (req as any).accessToken = result.accessToken;
    (req as any).user = result.user;

    console.log('[AUTH] Request authenticated successfully for shop:', shop);
    next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error instanceof Error ? error.message : error);
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication failed' 
    });
  }
}

/**
 * Middleware to extract shop context from various sources
 * Used for routes that need shop info but may not require full authentication
 */
export async function extractShopContext(req: Request, res: Response, next: NextFunction) {
  try {
    let shop: string | null = null;
    let accessToken: string | null = null;
    let user: any = null;

    // Try to get from session token first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const sessionToken = authHeader.substring(7);
      const payload = await validateSessionToken(sessionToken);
      
      if (payload) {
        shop = payload.dest.replace('https://', '');
        const result = await getAccessToken(sessionToken);
        if (result) {
          accessToken = result.accessToken;
          user = result.user;
        }
      }
    }

    // Fallback to query parameter or header
    if (!shop) {
      shop = (req.query.shop as string) || (req.headers['x-shopify-shop-domain'] as string) || null;
      
      // If we have a shop, try to get store from database
      if (shop) {
        const store = await storage.getStoreByDomain(shop);
        if (store) {
          accessToken = store.accessToken;
          user = await storage.getUser(store.userId);
        }
      }
    }

    // Attach to request
    (req as any).shop = shop;
    (req as any).accessToken = accessToken;
    (req as any).user = user;

    console.log('[AUTH] Shop context extracted:', {
      shop,
      hasAccessToken: !!accessToken,
      hasUser: !!user
    });

    next();
  } catch (error) {
    console.error('[AUTH] Error extracting shop context:', error instanceof Error ? error.message : error);
    next(); // Continue without shop context
  }
}

/**
 * Middleware for demo mode fallback
 * If no authenticated session, enable demo mode
 */
export async function enableDemoModeFallback(req: Request, res: Response, next: NextFunction) {
  const shop = (req as any).shop;
  const accessToken = (req as any).accessToken;

  if (!shop || !accessToken) {
    console.log('[AUTH] No authenticated session, enabling demo mode');
    (req as any).demoMode = true;
  } else {
    (req as any).demoMode = false;
  }

  next();
}
