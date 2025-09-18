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

  const { data: user, isLoading } = useQuery({
    queryKey: [authUrl], // Include parameters in query key for proper caching
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
