import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface DashboardStats {
    totalOITs: number;
    completedOITs: number;
    inProgressOITs: number;
    pendingOITs: number;
    totalResources: number;
    availableResources: number;
    recentOITs: any[];
}

export function useDashboardStats() {
    const [stats, setStats] = useState<DashboardStats>({
        totalOITs: 0,
        completedOITs: 0,
        inProgressOITs: 0,
        pendingOITs: 0,
        totalResources: 0,
        availableResources: 0,
        recentOITs: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [oitsRes, resourcesRes] = await Promise.all([
                    api.get('/oits'),
                    api.get('/resources')
                ]);

                const oits = oitsRes.data;
                const resources = resourcesRes.data;

                setStats({
                    totalOITs: oits.length,
                    completedOITs: oits.filter((o: any) => o.status === 'COMPLETED').length,
                    inProgressOITs: oits.filter((o: any) => o.status === 'IN_PROGRESS').length,
                    pendingOITs: oits.filter((o: any) => o.status === 'PENDING').length,
                    totalResources: resources.length,
                    availableResources: resources.filter((r: any) => r.status === 'AVAILABLE').length,
                    recentOITs: oits.slice(0, 5),
                });
            } catch (err) {
                console.error('Failed to fetch dashboard stats:', err);
                setError('Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    return { stats, isLoading, error };
}
