import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data);
            const unread = response.data.filter((n: Notification) => !n.read).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    // Request notification permission
    const requestPermission = async () => {
        if ('Notification' in window) {
            try {
                const perm = await Notification.requestPermission();
                setPermission(perm);
                return perm;
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                return 'denied';
            }
        }
        return 'denied';
    };

    // Show browser notification
    const showBrowserNotification = (title: string, body: string) => {
        if (permission === 'granted' && 'Notification' in window) {
            new Notification(title, {
                body,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'als-notification',
                requireInteraction: false
            });
        }
    };

    // Mark as read
    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    // Poll for new notifications
    useEffect(() => {
        fetchNotifications();

        // Check current permission
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }

        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);

        return () => clearInterval(interval);
    }, []);

    return {
        notifications,
        unreadCount,
        permission,
        requestPermission,
        showBrowserNotification,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications
    };
}
