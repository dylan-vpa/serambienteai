import { useState, useEffect } from 'react';
import { fetchOITs } from '@/lib/api';

export interface OIT {
    id: string;
    oitNumber?: string;
    description?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export function useOITs(searchQuery?: string) {
    const [oits, setOits] = useState<OIT[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadOITs = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await fetchOITs(searchQuery);
                setOits(data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Error al cargar OITs');
                setOits([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadOITs();
    }, [searchQuery]);

    return { oits, isLoading, error };
}
