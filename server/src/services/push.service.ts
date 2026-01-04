/**
 * Push Notification Service
 * Handles Web Push notifications using VAPID
 */

import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@serambiente.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('✅ Web Push VAPID configured');
} else {
    console.warn('⚠️ VAPID keys not configured - push notifications disabled');
}

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    data?: any;
}

export class PushService {
    /**
     * Get VAPID public key for client subscription
     */
    getPublicKey(): string {
        return VAPID_PUBLIC_KEY;
    }

    /**
     * Subscribe a user to push notifications
     */
    async subscribe(userId: string, subscription: any): Promise<boolean> {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { pushSubscription: JSON.stringify(subscription) }
            });
            console.log(`📱 User ${userId} subscribed to push`);
            return true;
        } catch (error) {
            console.error('Error subscribing user:', error);
            return false;
        }
    }

    /**
     * Unsubscribe a user from push notifications
     */
    async unsubscribe(userId: string): Promise<boolean> {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { pushSubscription: null }
            });
            console.log(`📴 User ${userId} unsubscribed from push`);
            return true;
        } catch (error) {
            console.error('Error unsubscribing user:', error);
            return false;
        }
    }

    /**
     * Send push notification to a specific user
     */
    async sendToUser(userId: string, payload: PushPayload): Promise<boolean> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { pushSubscription: true }
            });

            if (!user?.pushSubscription) {
                console.log(`No push subscription for user ${userId}`);
                return false;
            }

            const subscription = JSON.parse(user.pushSubscription);
            return await this.sendPush(subscription, payload);
        } catch (error) {
            console.error(`Error sending push to user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Send push notification to all subscribed users
     */
    async sendToAll(payload: PushPayload): Promise<number> {
        try {
            const users = await prisma.user.findMany({
                where: { pushSubscription: { not: null } },
                select: { id: true, pushSubscription: true }
            });

            let sent = 0;
            for (const user of users) {
                if (user.pushSubscription) {
                    const subscription = JSON.parse(user.pushSubscription);
                    const success = await this.sendPush(subscription, payload);
                    if (success) sent++;
                }
            }

            console.log(`📤 Push sent to ${sent}/${users.length} users`);
            return sent;
        } catch (error) {
            console.error('Error sending push to all:', error);
            return 0;
        }
    }

    /**
     * Send push notification using web-push
     */
    private async sendPush(subscription: webpush.PushSubscription, payload: PushPayload): Promise<boolean> {
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            console.warn('VAPID not configured, skipping push');
            return false;
        }

        try {
            const pushPayload = JSON.stringify({
                title: payload.title,
                body: payload.body,
                icon: payload.icon || '/logo.png',
                badge: payload.badge || '/logo.png',
                tag: payload.tag || 'als-notification',
                data: {
                    url: payload.url || '/',
                    ...payload.data
                }
            });

            await webpush.sendNotification(subscription, pushPayload);
            return true;
        } catch (error: any) {
            // Handle expired subscriptions
            if (error.statusCode === 410 || error.statusCode === 404) {
                console.log('Subscription expired, removing...');
                // Could clean up expired subscriptions here
            } else {
                console.error('Push send error:', error);
            }
            return false;
        }
    }
}

export const pushService = new PushService();
