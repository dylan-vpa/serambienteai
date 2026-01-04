"use strict";
/**
 * Push Notification Routes
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const push_service_1 = require("../services/push.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: push_service_1.pushService.getPublicKey() });
});
// Subscribe to push notifications
router.post('/subscribe', auth_middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { subscription } = req.body;
        if (!subscription) {
            return res.status(400).json({ error: 'Subscription data required' });
        }
        const success = yield push_service_1.pushService.subscribe(userId, subscription);
        if (success) {
            res.json({ message: 'Subscribed to push notifications' });
        }
        else {
            res.status(500).json({ error: 'Failed to subscribe' });
        }
    }
    catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Unsubscribe from push notifications
router.post('/unsubscribe', auth_middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const success = yield push_service_1.pushService.unsubscribe(userId);
        if (success) {
            res.json({ message: 'Unsubscribed from push notifications' });
        }
        else {
            res.status(500).json({ error: 'Failed to unsubscribe' });
        }
    }
    catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Test push notification (for debugging)
router.post('/test', auth_middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const success = yield push_service_1.pushService.sendToUser(userId, {
            title: '🔔 Notificación de Prueba',
            body: '¡Las notificaciones push están funcionando correctamente!',
            url: '/notifications'
        });
        if (success) {
            res.json({ message: 'Test notification sent' });
        }
        else {
            res.status(400).json({ error: 'No push subscription found. Please subscribe first.' });
        }
    }
    catch (error) {
        console.error('Test push error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
