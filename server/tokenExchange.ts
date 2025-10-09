import jwt from 'jsonwebtoken';
import { storage } from './storage';

interface SessionTokenPayload {
  iss: string;  // Shop domain URL
  dest: string; // Shop domain URL
  aud: string;  // API key
  sub: string;  // User ID
  exp: number;  // Expiration
  nbf: number;  // Not before
  iat: number;  // Issued at
  jti: string;  // JWT ID
  sid: string;  // Session ID
}

/**
 * Validate a session token from Shopify App Bridge
 * Returns decoded payload if valid, null otherwise
 */
export async function validateSessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (!apiSecret) {
      console.error('[TOKEN_EXCHANGE] SHOPIFY_API_SECRET not configured');
      return null;
    }

    // Verify and decode the JWT
    const decoded = jwt.verify(token, apiSecret, {
      algorithms: ['HS256']
    }) as SessionTokenPayload;

    console.log('[TOKEN_EXCHANGE] Session token validated:', {
      shop: decoded.dest?.replace('https://', ''),
      sub: decoded.sub,
      exp: new Date(decoded.exp * 1000).toISOString()
    });

    return decoded;
  } catch (error) {
    console.error('[TOKEN_EXCHANGE] Session token validation failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Exchange a session token for an access token using Shopify's token exchange API
 * This is the modern approach recommended by Shopify for embedded apps
 */
export async function exchangeToken(sessionToken: string, requestOfflineToken: boolean = false): Promise<{
  accessToken: string;
  shop: string;
  scope: string;
  expiresIn?: number;
  associatedUserScope?: string;
  associatedUser?: any;
} | null> {
  try {
    // First, validate the session token
    const payload = await validateSessionToken(sessionToken);
    if (!payload) {
      console.error('[TOKEN_EXCHANGE] Invalid session token');
      return null;
    }

    const shop = payload.dest.replace('https://', '');
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('[TOKEN_EXCHANGE] Missing API credentials');
      return null;
    }

    console.log('[TOKEN_EXCHANGE] Exchanging session token for access token:', {
      shop,
      requestOfflineToken
    });

    // Perform token exchange with Shopify
    const tokenType = requestOfflineToken 
      ? 'urn:shopify:params:oauth:token-type:offline-access-token'
      : 'urn:shopify:params:oauth:token-type:online-access-token';

    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: sessionToken,
        subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
        requested_token_type: tokenType
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TOKEN_EXCHANGE] Token exchange failed:', {
        status: response.status,
        error: errorText
      });
      return null;
    }

    const data = await response.json();
    
    console.log('[TOKEN_EXCHANGE] Token exchange successful:', {
      shop,
      hasAccessToken: !!data.access_token,
      scope: data.scope,
      expiresIn: data.expires_in
    });

    return {
      accessToken: data.access_token,
      shop,
      scope: data.scope,
      expiresIn: data.expires_in,
      associatedUserScope: data.associated_user_scope,
      associatedUser: data.associated_user
    };
  } catch (error) {
    console.error('[TOKEN_EXCHANGE] Error during token exchange:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get a fresh access token for a shop using session token
 * ALWAYS performs token exchange per request - online tokens are ephemeral (~1 min TTL)
 * For offline access tokens, use exchangeToken with requestOfflineToken=true and store separately
 */
export async function getAccessToken(sessionToken: string): Promise<{
  accessToken: string;
  shop: string;
  user: any;
} | null> {
  try {
    const payload = await validateSessionToken(sessionToken);
    if (!payload) {
      return null;
    }

    const shop = payload.dest.replace('https://', '');
    
    // ALWAYS perform token exchange - online tokens are short-lived and must not be cached
    console.log('[TOKEN_EXCHANGE] Performing fresh token exchange for shop:', shop);
    
    const exchangeResult = await exchangeToken(sessionToken, false);
    if (!exchangeResult) {
      console.error('[TOKEN_EXCHANGE] Token exchange failed for shop:', shop);
      return null;
    }

    // Create or update user based on associated user info
    let userId: string;
    if (exchangeResult.associatedUser) {
      const user = exchangeResult.associatedUser;
      userId = `shopify_${user.id}`;
      
      await storage.upsertUser({
        id: userId,
        email: user.email || null,
        firstName: user.first_name || null,
        lastName: user.last_name || null,
        profileImageUrl: user.avatar || null,
      });
    } else {
      // No associated user, create shop-based user
      userId = `shopify_shop_${shop.replace('.myshopify.com', '')}`;
      
      await storage.upsertUser({
        id: userId,
        email: null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
      });
    }

    // Check if store exists and update/create
    const existingStore = await storage.getStoreByDomain(shop);
    
    if (existingStore) {
      // Don't store the online token - it's ephemeral
      // Update only the metadata
      await storage.updateStore(existingStore.id, {
        isActive: true,
        lastSyncAt: new Date(),
      });
    } else {
      // Create store but don't persist the online token
      await storage.createStore({
        userId,
        name: shop.replace('.myshopify.com', ''),
        domain: shop,
        accessToken: '', // Don't store online tokens - they expire
        isActive: true,
        lastSyncAt: new Date(),
      });
    }

    const user = await storage.getUser(userId);

    console.log('[TOKEN_EXCHANGE] Fresh access token obtained for shop:', shop);

    return {
      accessToken: exchangeResult.accessToken, // Return the fresh token for this request
      shop,
      user
    };
  } catch (error) {
    console.error('[TOKEN_EXCHANGE] Error getting access token:', error instanceof Error ? error.message : error);
    return null;
  }
}
