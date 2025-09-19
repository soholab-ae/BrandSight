import { createContext, useContext, useEffect, useState } from 'react';

// Extend Window interface to include ShopifyAppBridge
declare global {
  interface Window {
    ShopifyAppBridge?: {
      createApp: (config: {
        apiKey: string;
        shop: string;
        host?: string;
        forceRedirect?: boolean;
      }) => any;
      ActionType: {
        ERROR: string;
      };
      actions: {
        Loading: {
          start: () => any;
          stop: () => any;
        };
      };
    };
  }
}

interface AppBridgeContextType {
  isEmbedded: boolean;
  appBridge: any;
  shop: string | null;
  host: string | null;
  authenticatedFetch: ((url: string, options?: RequestInit) => Promise<Response>) | null;
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
  const [appBridge, setAppBridge] = useState<any>(null);
  const [shop, setShop] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [authenticatedFetch, setAuthenticatedFetch] = useState<((url: string, options?: RequestInit) => Promise<Response>) | null>(null);

  useEffect(() => {
    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    const hostParam = urlParams.get('host');
    
    // Enhanced embedded context detection
    const embeddedDetection = 
      // URL parameters indicate embedded context
      shopParam || hostParam ||
      // Check if running in iframe
      window.location !== window.parent.location ||
      // Check referrer for Shopify admin
      document.referrer?.includes('admin.shopify.com') ||
      // Check for explicit embedded parameter
      urlParams.get('embedded') === '1';

    console.log('[AppBridge] Context detection:', {
      shopParam,
      hostParam,
      isIframe: window.location !== window.parent.location,
      referrer: document.referrer,
      embeddedDetection
    });

    setIsEmbedded(Boolean(embeddedDetection));
    setShop(shopParam);
    setHost(hostParam);

    // Initialize App Bridge if we're in embedded context and have required parameters
    if (embeddedDetection && shopParam && typeof window !== 'undefined' && window.ShopifyAppBridge) {
      try {
        console.log('[AppBridge] Initializing App Bridge for shop:', shopParam);
        
        const bridge = window.ShopifyAppBridge!.createApp({
          apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || 'your_api_key_here',
          shop: shopParam.replace('.myshopify.com', ''),
          host: hostParam || undefined,
          forceRedirect: true
        });

        console.log('[AppBridge] App Bridge initialized successfully:', bridge);
        setAppBridge(bridge);

        // Set up App Bridge error handling
        bridge.subscribe(window.ShopifyAppBridge!.ActionType.ERROR, (error: any) => {
          console.error('[AppBridge] Error:', error);
        });

        // Initialize authenticated fetch
        try {
          const authenticatedFetchFn = bridge.authenticatedFetch || bridge.getState?.()?.authenticatedFetch;
          if (authenticatedFetchFn) {
            console.log('[AppBridge] Setting up authenticated fetch');
            setAuthenticatedFetch(() => authenticatedFetchFn);
          } else {
            // Fallback: Create authenticated fetch manually using session token
            const authFetch = async (url: string, options: RequestInit = {}) => {
              try {
                // Get session token from App Bridge
                const sessionToken = await bridge.getSessionToken();
                if (sessionToken) {
                  console.log('[AppBridge] Using session token for authenticated request');
                  return fetch(url, {
                    ...options,
                    headers: {
                      ...options.headers,
                      'Authorization': `Bearer ${sessionToken}`,
                      'Content-Type': 'application/json',
                    },
                  });
                } else {
                  console.warn('[AppBridge] No session token available, falling back to regular fetch');
                  return fetch(url, options);
                }
              } catch (error) {
                console.error('[AppBridge] Error getting session token:', error);
                return fetch(url, options);
              }
            };
            setAuthenticatedFetch(() => authFetch);
          }
        } catch (error) {
          console.error('[AppBridge] Failed to set up authenticated fetch:', error);
          setAuthenticatedFetch(null);
        }

        // Handle loading state
        bridge.dispatch(window.ShopifyAppBridge!.actions.Loading.start());
        
        // Stop loading after a short delay to allow content to render
        setTimeout(() => {
          bridge.dispatch(window.ShopifyAppBridge!.actions.Loading.stop());
        }, 1000);

      } catch (error) {
        console.error('[AppBridge] Failed to initialize App Bridge:', error);
      }
    } else if (embeddedDetection) {
      console.log('[AppBridge] Embedded context detected but missing required parameters or App Bridge not loaded');
    }

    // For non-embedded context, ensure we're not stuck in loading
    if (!embeddedDetection) {
      console.log('[AppBridge] Non-embedded context detected');
    }

  }, []);

  return (
    <AppBridgeContext.Provider value={{ isEmbedded, appBridge, shop, host, authenticatedFetch }}>
      {children}
    </AppBridgeContext.Provider>
  );
}