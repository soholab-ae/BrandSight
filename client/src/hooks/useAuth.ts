import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useAuth() {

  // Enhanced parameter extraction for embedded contexts
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    let shop = urlParams.get('shop');
    let host = urlParams.get('host');
    
    // Check for embedded context indicators
    const isEmbeddedContext = window.location !== window.parent.location ||
                              document.referrer?.includes('admin.shopify.com') ||
                              urlParams.get('embedded') === '1';
    
    console.log('[AUTH] URL parameters:', { shop, host, isEmbeddedContext });
    
    // If we don't have shop/host but we're in embedded context, try other methods
    if ((!shop || !host) && isEmbeddedContext) {
      // Try to extract from referrer
      try {
        if (document.referrer && document.referrer.includes('admin.shopify.com')) {
          const referrerUrl = new URL(document.referrer);
          const pathParts = referrerUrl.pathname.split('/');
          const storeIndex = pathParts.indexOf('store');
          if (storeIndex !== -1 && pathParts[storeIndex + 1] && !shop) {
            shop = `${pathParts[storeIndex + 1]}.myshopify.com`;
            console.log('[AUTH] Extracted shop from referrer:', shop);
          }
          
          // Extract host from referrer search params if available
          if (!host) {
            const referrerParams = new URLSearchParams(referrerUrl.search);
            host = referrerParams.get('host');
            if (host) {
              console.log('[AUTH] Extracted host from referrer:', host);
            }
          }
        }
      } catch (error) {
        console.log('[AUTH] Failed to extract from referrer:', error);
      }
      
      // Note: Removed parent postMessage flow as Shopify admin doesn't emit SHOPIFY_PARAMS_RESPONSE messages
    }
    
    return { shop, host, isEmbeddedContext };
  };

  const { shop: urlShop, host: urlHost, isEmbeddedContext } = getUrlParams();
  
  // Use URL params directly (no more embedded params from postMessage)
  const shop = urlShop;
  const host = urlHost;

  // Note: Removed postMessage listener - Shopify admin doesn't emit SHOPIFY_PARAMS_RESPONSE messages
  
  // Build query string with shop and host parameters if they exist
  const buildAuthUrl = () => {
    const baseUrl = "/api/auth/user";
    const params = new URLSearchParams();
    
    if (shop) {
      params.append('shop', shop);
    }
    if (host) {
      params.append('host', host);
    }
    
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  const authUrl = buildAuthUrl();

  const { data: user, isLoading, error } = useQuery({
    queryKey: [authUrl], // Include parameters in query key for proper caching
    retry: false,
    queryFn: async () => {
      const response = await fetch(authUrl);
      
      // Handle both 401 (unauthorized) and 302 (redirect to auth)
      if (response.status === 401 || response.status === 302) {
        console.log(`[AUTH] Authentication required (${response.status}). Embedded context: ${isEmbeddedContext}`);
        
        // For 302 redirects, use the Location header
        if (response.status === 302) {
          const redirectUrl = response.headers.get('Location');
          if (redirectUrl) {
            console.log('[AUTH] Server redirect (302), following to:', redirectUrl);
            // Use top-frame redirect for embedded apps
            if (isEmbeddedContext && window.top) {
              console.log('[AUTH] Using top-frame redirect for embedded app');
              window.top.location.href = redirectUrl;
            } else {
              window.location.href = redirectUrl;
            }
            return null;
          }
        }
        
        // For 401, try to parse JSON response
        let errorData: any = null;
        try {
          errorData = await response.json();
          console.log('[AUTH] 401 response data:', errorData);
        } catch (e) {
          console.log('[AUTH] Could not parse 401 response as JSON:', e);
        }
        
        // Handle server-provided loginUrl (preferred approach)
        if (errorData?.loginUrl) {
          let loginUrl = errorData.loginUrl;
          
          // Append shop and host parameters if they're missing in the loginUrl
          const urlObj = new URL(loginUrl, window.location.origin);
          if (shop && !urlObj.searchParams.has('shop')) {
            urlObj.searchParams.set('shop', shop);
          }
          if (host && !urlObj.searchParams.has('host')) {
            urlObj.searchParams.set('host', host);
          }
          loginUrl = urlObj.toString();
          
          console.log('[AUTH] Server provided loginUrl, redirecting:', loginUrl);
          
          // Use top-frame redirect for embedded apps
          if (isEmbeddedContext && window.top) {
            console.log('[AUTH] Using top-frame redirect for embedded app');
            window.top.location.href = loginUrl;
          } else {
            window.location.href = loginUrl;
          }
          return null;
        }
        
        // Handle special embedded app reload case
        if (errorData?.requiresReload) {
          console.log('[AUTH] Server requested reload for embedded app');
          const currentUrl = new URL(window.location.href);
          if (!currentUrl.searchParams.has('embedded')) {
            currentUrl.searchParams.set('embedded', '1');
          }
          if (shop && !currentUrl.searchParams.has('shop')) {
            currentUrl.searchParams.set('shop', shop);
          }
          if (host && !currentUrl.searchParams.has('host')) {
            currentUrl.searchParams.set('host', host);
          }
          
          // Use top-frame redirect for embedded apps
          if (isEmbeddedContext && window.top) {
            console.log('[AUTH] Using top-frame reload for embedded app');
            window.top.location.href = currentUrl.toString();
          } else {
            window.location.href = currentUrl.toString();
          }
          return null;
        }
        
        // Fallback: build login URL with current shop/host parameters
        const fallbackParams = new URLSearchParams();
        if (shop) {
          fallbackParams.append('shop', shop);
        }
        if (host) {
          fallbackParams.append('host', host);
        }
        
        const fallbackLoginUrl = `/api/login${fallbackParams.toString() ? `?${fallbackParams.toString()}` : ''}`;
        console.log('[AUTH] Using fallback loginUrl, redirecting:', fallbackLoginUrl);
        
        // Use top-frame redirect for embedded apps
        if (isEmbeddedContext && window.top) {
          console.log('[AUTH] Using top-frame redirect for embedded app fallback');
          window.top.location.href = fallbackLoginUrl;
        } else {
          window.location.href = fallbackLoginUrl;
        }
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
