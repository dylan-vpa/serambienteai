import { useState, useEffect } from 'react';
import { searchGlobal } from '@/lib/api';
import type { OIT } from './useOITs';
import type { Resource } from './useResources';

export interface GlobalSearchResults {
    oits: OIT[];
    resources: Resource[];
}

export function useGlobalSearch(query: string, debounceMs: number = 300) {
    const [results, setResults] = useState<GlobalSearchResults>({ oits: [], resources: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query.trim()) {
            setResults({ oits: [], resources: [] });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(async () => {
            try {
                setError(null);
                const data = await searchGlobal(query);
                setResults(data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Error en la búsqueda');
                setResults({ oits: [], resources: [] });
            } finally {
                setIsLoading(false);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, debounceMs]);

    return { results, isLoading, error };
}
