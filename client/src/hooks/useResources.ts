import { useState, useEffect } from 'react';
import { fetchResources } from '@/lib/api';

export interface Resource {
    id: string;
    name: string;
    type: string;
    quantity: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export function useResources(searchQuery?: string) {
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadResources = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await fetchResources(searchQuery);
                setResources(data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Error al cargar recursos');
                setResources([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadResources();
    }, [searchQuery]);

    return { resources, isLoading, error };
}
