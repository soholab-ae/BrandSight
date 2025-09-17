import { ReactNode, Suspense } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { 
  ChartSkeleton, 
  TableSkeleton, 
  CardListSkeleton, 
  MetricsCardSkeleton,
  VirtualizedTableSkeleton
} from '@/components/Skeletons';

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackType?: 'chart' | 'table' | 'cards' | 'metrics' | 'virtualized';
  minHeight?: string;
  className?: string;
  immediate?: boolean; // Load immediately without intersection observer
  rootMargin?: string; // How far from viewport to start loading
  skeletonProps?: any; // Props to pass to skeleton components
}


export default function LazyWrapper({
  children,
  fallback,
  fallbackType = 'table',
  minHeight = 'auto',
  className = '',
  immediate = false,
  rootMargin = '50px',
  skeletonProps = {}
}: LazyWrapperProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin,
    freezeOnceVisible: true,
  });

  // Load immediately or when in viewport
  const shouldLoad = immediate || isIntersecting;

  // Determine appropriate fallback based on type
  const getFallback = () => {
    if (fallback) return fallback;
    
    switch (fallbackType) {
      case 'chart':
        return <ChartSkeleton {...skeletonProps} />;
      case 'table':
        return <TableSkeleton {...skeletonProps} />;
      case 'cards':
        return <CardListSkeleton {...skeletonProps} />;
      case 'metrics':
        return <MetricsCardSkeleton {...skeletonProps} />;
      case 'virtualized':
        return <VirtualizedTableSkeleton {...skeletonProps} />;
      default:
        // Auto-detect based on minHeight or className
        if (minHeight.includes('64') || className.includes('chart')) {
          return <ChartSkeleton {...skeletonProps} />;
        }
        return <TableSkeleton {...skeletonProps} />;
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight }}
      data-testid="lazy-wrapper"
    >
      {shouldLoad ? (
        <Suspense fallback={getFallback()}>
          {children}
        </Suspense>
      ) : (
        getFallback()
      )}
    </div>
  );
}