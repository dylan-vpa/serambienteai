/**
 * Push Notifications Hook
 * Handles service worker registration and push subscription
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface PushState {
    isSupported: boolean;
    isSubscribed: boolean;
    permission: NotificationPermission;
    loading: boolean;
}

export function usePushNotifications() {
    const [state, setState] = useState<PushState>({
        isSupported: false,
        isSubscribed: false,
        permission: 'default',
        loading: true
    });

    // Check if push is supported
    useEffect(() => {
        const checkSupport = async () => {
            const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

            if (!isSupported) {
                setState(prev => ({ ...prev, isSupported: false, loading: false }));
                return;
            }

            // Check current permission
            const permission = Notification.permission;

            // Check if already subscribed
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();

                setState({
                    isSupported: true,
                    isSubscribed: !!subscription,
                    permission,
                    loading: false
                });
            } catch (error) {
                console.error('Error checking push subscription:', error);
                setState(prev => ({ ...prev, isSupported: true, loading: false }));
            }
        };

        checkSupport();
    }, []);

    // Subscribe to push notifications
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!state.isSupported) {
            console.warn('Push not supported');
            return false;
        }

        setState(prev => ({ ...prev, loading: true }));

        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            setState(prev => ({ ...prev, permission }));

            if (permission !== 'granted') {
                setState(prev => ({ ...prev, loading: false }));
                return false;
            }

            // Get VAPID public key from server
            const { data: { publicKey } } = await api.get('/push/vapid-public-key');

            if (!publicKey) {
                console.error('No VAPID public key from server');
                setState(prev => ({ ...prev, loading: false }));
                return false;
            }

            // Register service worker if not already registered
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
            });

            // Send subscription to server
            await api.post('/push/subscribe', { subscription: subscription.toJSON() });

            setState(prev => ({
                ...prev,
                isSubscribed: true,
                loading: false
            }));

            console.log('✅ Push subscription successful');
            return true;

        } catch (error) {
            console.error('Error subscribing to push:', error);
            setState(prev => ({ ...prev, loading: false }));
            return false;
        }
    }, [state.isSupported]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setState(prev => ({ ...prev, loading: true }));

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                await api.post('/push/unsubscribe');
            }

            setState(prev => ({
                ...prev,
                isSubscribed: false,
                loading: false
            }));

            console.log('📴 Push unsubscribed');
            return true;

        } catch (error) {
            console.error('Error unsubscribing from push:', error);
            setState(prev => ({ ...prev, loading: false }));
            return false;
        }
    }, []);

    // Test push notification
    const testPush = useCallback(async (): Promise<boolean> => {
        try {
            await api.post('/push/test');
            return true;
        } catch (error) {
            console.error('Error testing push:', error);
            return false;
        }
    }, []);

    return {
        ...state,
        subscribe,
        unsubscribe,
        testPush
    };
}

// Helper: Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}
