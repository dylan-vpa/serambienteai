import { useState, useEffect } from 'react';
import api from '@/lib/api';

export const useUnreadNotifications = () => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                // Check if user is authenticated by checking for token
                const token = localStorage.getItem('token');
                if (!token) {
                    setUnreadCount(0);
                    return;
                }

                const response = await api.get('/notifications');
                const notifications = response.data;
                const unread = notifications.filter((n: any) => !n.read).length;
                setUnreadCount(unread);
            } catch (error: any) {
                // Silently handle 401 errors (user not authenticated)
                if (error?.response?.status === 401) {
                    setUnreadCount(0);
                    return;
                }
                console.error('Error fetching unread count:', error);
            }
        };

        fetchUnreadCount();

        // Poll every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);

        return () => clearInterval(interval);
    }, []);

    return unreadCount;
};
