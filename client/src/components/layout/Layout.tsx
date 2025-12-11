import { useRef, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';

export function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { notifications, refreshNotifications } = useNotifications();
    const prevCountRef = useRef(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initial fetch
    useEffect(() => {
        refreshNotifications();
        prevCountRef.current = notifications.length;
        // Initialize simple notification sound
        audioRef.current = new Audio('/notification.mp3');
    }, []);

    // Watch for new notifications
    useEffect(() => {
        if (notifications.length > prevCountRef.current) {
            // New notification detected
            const latest = notifications[0];

            // 1. Show Toast
            toast(latest.title, {
                description: latest.message,
                action: {
                    label: 'Ver',
                    onClick: () => window.location.href = '/notifications'
                }
            });

            // 2. Play Sound
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.log('Audio play failed', e));
            }

            // 3. System Notification
            if (Notification.permission === 'granted') {
                try {
                    new Notification(latest.title, {
                        body: latest.message,
                        icon: '/logo.png'
                    });
                } catch (e) {
                    console.error('System notification failed', e);
                }
            }
        }
        prevCountRef.current = notifications.length;
    }, [notifications]);

    // Global Polling
    useEffect(() => {
        const interval = setInterval(refreshNotifications, 10000); // 10s poll
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex h-screen w-full bg-slate-50">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
