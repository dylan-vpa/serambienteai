"use strict";
/**
 * Push Notification Service
 * Handles Web Push notifications using VAPID
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushService = exports.PushService = void 0;
const web_push_1 = __importDefault(require("web-push"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@serambiente.com';
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    web_push_1.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('✅ Web Push VAPID configured');
}
else {
    console.warn('⚠️ VAPID keys not configured - push notifications disabled');
}
class PushService {
    /**
     * Get VAPID public key for client subscription
     */
    getPublicKey() {
        return VAPID_PUBLIC_KEY;
    }
    /**
     * Subscribe a user to push notifications
     */
    subscribe(userId, subscription) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.user.update({
                    where: { id: userId },
                    data: { pushSubscription: JSON.stringify(subscription) }
                });
                console.log(`📱 User ${userId} subscribed to push`);
                return true;
            }
            catch (error) {
                console.error('Error subscribing user:', error);
                return false;
            }
        });
    }
    /**
     * Unsubscribe a user from push notifications
     */
    unsubscribe(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.user.update({
                    where: { id: userId },
                    data: { pushSubscription: null }
                });
                console.log(`📴 User ${userId} unsubscribed from push`);
                return true;
            }
            catch (error) {
                console.error('Error unsubscribing user:', error);
                return false;
            }
        });
    }
    /**
     * Send push notification to a specific user
     */
    sendToUser(userId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield prisma.user.findUnique({
                    where: { id: userId },
                    select: { pushSubscription: true }
                });
                if (!(user === null || user === void 0 ? void 0 : user.pushSubscription)) {
                    console.log(`No push subscription for user ${userId}`);
                    return false;
                }
                const subscription = JSON.parse(user.pushSubscription);
                return yield this.sendPush(subscription, payload);
            }
            catch (error) {
                console.error(`Error sending push to user ${userId}:`, error);
                return false;
            }
        });
    }
    /**
     * Send push notification to all subscribed users
     */
    sendToAll(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = yield prisma.user.findMany({
                    where: { pushSubscription: { not: null } },
                    select: { id: true, pushSubscription: true }
                });
                let sent = 0;
                for (const user of users) {
                    if (user.pushSubscription) {
                        const subscription = JSON.parse(user.pushSubscription);
                        const success = yield this.sendPush(subscription, payload);
                        if (success)
                            sent++;
                    }
                }
                console.log(`📤 Push sent to ${sent}/${users.length} users`);
                return sent;
            }
            catch (error) {
                console.error('Error sending push to all:', error);
                return 0;
            }
        });
    }
    /**
     * Send push notification using web-push
     */
    sendPush(subscription, payload) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    data: Object.assign({ url: payload.url || '/' }, payload.data)
                });
                yield web_push_1.default.sendNotification(subscription, pushPayload);
                return true;
            }
            catch (error) {
                // Handle expired subscriptions
                if (error.statusCode === 410 || error.statusCode === 404) {
                    console.log('Subscription expired, removing...');
                    // Could clean up expired subscriptions here
                }
                else {
                    console.error('Push send error:', error);
                }
                return false;
            }
        });
    }
}
exports.PushService = PushService;
exports.pushService = new PushService();
