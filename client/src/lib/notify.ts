import { toast as sonnerToast } from 'sonner';

export const notify = {
    success: (message: string) => {
        sonnerToast.success(message);
        sendSystemNotification('Éxito', message);
    },
    error: (message: string) => {
        sonnerToast.error(message);
        sendSystemNotification('Error', message);
    },
    info: (message: string) => {
        sonnerToast.info(message);
        sendSystemNotification('Información', message);
    },
    warning: (message: string) => {
        sonnerToast.warning(message);
        sendSystemNotification('Advertencia', message);
    }
};

function sendSystemNotification(title: string, body: string) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/pwa-192x192.png' });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body, icon: '/pwa-192x192.png' });
            }
        });
    }
}
