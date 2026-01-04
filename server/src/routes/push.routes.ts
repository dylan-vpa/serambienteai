/**
 * Push Notification Routes
 */

import { Router, Request, Response } from 'express';
import { pushService } from '../services/push.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get VAPID public key
router.get('/vapid-public-key', (req: Request, res: Response) => {
    res.json({ publicKey: pushService.getPublicKey() });
});

// Subscribe to push notifications
router.post('/subscribe', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { subscription } = req.body;

        if (!subscription) {
            return res.status(400).json({ error: 'Subscription data required' });
        }

        const success = await pushService.subscribe(userId, subscription);

        if (success) {
            res.json({ message: 'Subscribed to push notifications' });
        } else {
            res.status(500).json({ error: 'Failed to subscribe' });
        }
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const success = await pushService.unsubscribe(userId);

        if (success) {
            res.json({ message: 'Unsubscribed from push notifications' });
        } else {
            res.status(500).json({ error: 'Failed to unsubscribe' });
        }
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Test push notification (for debugging)
router.post('/test', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const success = await pushService.sendToUser(userId, {
            title: '🔔 Notificación de Prueba',
            body: '¡Las notificaciones push están funcionando correctamente!',
            url: '/notifications'
        });

        if (success) {
            res.json({ message: 'Test notification sent' });
        } else {
            res.status(400).json({ error: 'No push subscription found. Please subscribe first.' });
        }
    } catch (error) {
        console.error('Test push error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
