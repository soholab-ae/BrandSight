import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Extract shop and host parameters from URL
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop');
    const host = urlParams.get('host');
    
    return { shop, host };
  };

  const { shop, host } = getUrlParams();
  
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
      
      if (response.status === 401) {
        try {
          const errorData = await response.json();
          
          // Check if server provided a loginUrl
          if (errorData.loginUrl) {
            console.log('[AUTH] Server provided loginUrl, redirecting:', errorData.loginUrl);
            window.location.href = errorData.loginUrl;
            return null;
          }
        } catch (e) {
          console.log('[AUTH] Could not parse 401 response as JSON');
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
        window.location.href = fallbackLoginUrl;
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
