import { useMemo } from 'react';
import { Resource } from '@/types';
import { calculateYearlyStats } from '@/utils';

// We use a WeakMap to cache results for specific object references.
const statsCache = new WeakMap<Resource, { days: number; cost: number; year: number }>();

/**
 * Helper to get stats with caching strategy (Non-hook version)
 * Useful for sorting/filtering in parent components.
 */
export function getCachedResourceStats(resource: Resource, year: number) {
    // 1. Check Cache
    const cached = statsCache.get(resource);
    if (cached && cached.year === year) {
        return cached;
    }

    // 2. Calculate
    const result = calculateYearlyStats(resource, year);

    // 3. Store Cache
    const valueToCache = { ...result, year };
    statsCache.set(resource, valueToCache);

    return valueToCache;
}

/**
 * Hook version for components
 */
export function useResourceStats(resource: Resource, year: number) {
    const stats = useMemo(() => {
        return getCachedResourceStats(resource, year);
    }, [resource, year]);

    return stats;
}
