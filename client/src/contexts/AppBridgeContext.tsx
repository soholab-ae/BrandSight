import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Shopify App Bridge types
declare global {
  interface Window {
    shopify?: {
      environment?: {
        embedded?: boolean;
        mobile?: boolean;
        pos?: boolean;
      };
    };
  }
}

// Import App Bridge from CDN (loaded in index.html)
let AppBridge: any = null;
if (typeof window !== 'undefined') {
  AppBridge = (window as any).AppBridge;
}

interface AppBridgeContextType {
  isEmbedded: boolean;
  app: any;
  shop: string | null;
  host: string | null;
  ready: boolean;
  getSessionToken: () => Promise<string | null>;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AppBridgeContext = createContext<AppBridgeContextType | null>(null);

export function useAppBridge() {
  const context = useContext(AppBridgeContext);
  if (!context) {
    throw new Error('useAppBridge must be used within AppBridgeProvider');
  }
  return context;
}

interface AppBridgeProviderProps {
  children: React.ReactNode;
}

export function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [app, setApp] = useState<any>(null);
  const [shop, setShop] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Get session token from App Bridge
  const getSessionToken = useCallback(async (): Promise<string | null> => {
    if (!app) {
      console.warn('[AppBridge] App instance not available for getting session token');
      return null;
    }

    try {
      // App Bridge 3.x method
      if (typeof app.idToken === 'function') {
        const token = await app.idToken();
        console.log('[AppBridge] Got session token via idToken()');
        return token;
      }
      
      // App Bridge 2.x fallback
      if (typeof app.getSessionToken === 'function') {
        const token = await app.getSessionToken();
        console.log('[AppBridge] Got session token via getSessionToken()');
        return token;
      }

      console.warn('[AppBridge] No session token method available');
      return null;
    } catch (error) {
      console.error('[AppBridge] Error getting session token:', error);
      return null;
    }
  }, [app]);

  // Authenticated fetch that includes session token
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      const sessionToken = await getSessionToken();
      
      if (sessionToken) {
        console.log('[AppBridge] Making authenticated request to:', url);
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        console.warn('[AppBridge] No session token available, using regular fetch');
        return fetch(url, options);
      }
    } catch (error) {
      console.error('[AppBridge] Error in authenticated fetch:', error);
      return fetch(url, options);
    }
  }, [getSessionToken]);

  useEffect(() => {
    // Check if we're running in Shopify's environment
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    const hostParam = urlParams.get('host');
    const embeddedParam = urlParams.get('embedded');

    // Detect embedded context
    const embeddedDetection = 
      window.self !== window.top || // Running in iframe
      embeddedParam === '1' ||
      shopParam !== null ||
      hostParam !== null ||
      window.shopify?.environment?.embedded === true;

    console.log('[AppBridge] Environment detection:', {
      isIframe: window.self !== window.top,
      shopParam,
      hostParam,
      embeddedParam,
      shopifyEnv: window.shopify?.environment,
      embeddedDetection
    });

    setIsEmbedded(embeddedDetection);
    setShop(shopParam);
    setHost(hostParam);

    // Initialize App Bridge if we're embedded and have the library
    if (embeddedDetection && AppBridge && shopParam) {
      try {
        const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY;
        
        if (!apiKey) {
          console.error('[AppBridge] VITE_SHOPIFY_API_KEY not configured');
          return;
        }

        console.log('[AppBridge] Initializing App Bridge with config:', {
          apiKey,
          shop: shopParam,
          host: hostParam
        });

        // Create App Bridge instance
        const config = {
          apiKey,
          host: hostParam || btoa(`${shopParam}/admin`),
          forceRedirect: true
        };

        const appInstance = AppBridge.createApp(config);
        
        console.log('[AppBridge] App Bridge initialized successfully');
        setApp(appInstance);
        setReady(true);

        // Test getting session token
        (async () => {
          try {
            let token = null;
            if (typeof appInstance.idToken === 'function') {
              token = await appInstance.idToken();
            } else if (typeof appInstance.getSessionToken === 'function') {
              token = await appInstance.getSessionToken();
            }
            
            if (token) {
              console.log('[AppBridge] Session token obtained successfully');
            } else {
              console.warn('[AppBridge] No session token available');
            }
          } catch (error) {
            console.error('[AppBridge] Error testing session token:', error);
          }
        })();

      } catch (error) {
        console.error('[AppBridge] Failed to initialize App Bridge:', error);
        setReady(true); // Set ready anyway to not block the app
      }
    } else {
      console.log('[AppBridge] Not initializing App Bridge:', {
        embeddedDetection,
        hasAppBridge: !!AppBridge,
        shopParam
      });
      setReady(true);
    }
  }, []);

  return (
    <AppBridgeContext.Provider value={{ 
      isEmbedded, 
      app, 
      shop, 
      host, 
      ready,
      getSessionToken,
      authenticatedFetch
    }}>
      {children}
    </AppBridgeContext.Provider>
  );
}
