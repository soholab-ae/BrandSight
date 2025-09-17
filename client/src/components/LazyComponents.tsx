import { lazy } from 'react';

// Lazy load heavy chart and table components for better performance
export const LazyVendorPerformanceChart = lazy(() => import('@/components/VendorPerformanceChart'));
export const LazyVendorComparisonTable = lazy(() => import('@/components/VendorComparisonTable'));
export const LazyTopProducts = lazy(() => import('@/components/TopProducts'));
export const LazyLandingPagesAnalysis = lazy(() => import('@/components/LandingPagesAnalysis'));
export const LazyReferralSources = lazy(() => import('@/components/ReferralSources'));
export const LazyRevenueChart = lazy(() => import('@/components/RevenueChart'));

// Lazy load virtualized components for very large datasets
export const LazyVirtualizedVendorTable = lazy(() => import('@/components/VirtualizedVendorTable'));
export const LazyInfiniteVendorTable = lazy(() => import('@/components/InfiniteVendorTable'));