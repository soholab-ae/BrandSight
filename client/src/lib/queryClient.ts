import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { MemoryOptimizer } from "@/lib/memory-optimization";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    
    // Memory optimization: trigger cleanup for large datasets
    if (typeof window !== 'undefined' && data && Array.isArray(data) && data.length > 100) {
      setTimeout(() => {
        const memoryStats = MemoryOptimizer.getMemoryStats();
        if (memoryStats.cacheSize > 10 * 1024 * 1024) { // 10MB threshold
          MemoryOptimizer.performCleanup();
        }
      }, 1000);
    }
    
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes for memory optimization
      gcTime: 5 * 60 * 1000, // 5 minutes cache time (was cacheTime)
      retry: false,
    },
    mutations: {
      retry: false,
      gcTime: 0, // Clear failed mutations quickly
    },
  },
});

// Initialize memory optimization after QueryClient creation
if (typeof window !== 'undefined') {
  MemoryOptimizer.initialize();
  MemoryOptimizer.optimizeQueryCache();
}
