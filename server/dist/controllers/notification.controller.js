"use strict";
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
exports.createNotification = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const notifications = yield prisma.notification.findMany({
            where: { userId },
            include: {
                oit: {
                    select: {
                        id: true,
                        oitNumber: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notifications);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});
exports.getNotifications = getNotifications;
const markAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const notification = yield prisma.notification.findFirst({
            where: { id, userId }
        });
        if (!notification) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        const updated = yield prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Error al marcar como leída' });
    }
});
exports.markAsRead = markAsRead;
const markAllAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        yield prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    }
    catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: 'Error al marcar todas como leídas' });
    }
});
exports.markAllAsRead = markAllAsRead;
const deleteNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const notification = yield prisma.notification.findFirst({
            where: { id, userId }
        });
        if (!notification) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        yield prisma.notification.delete({
            where: { id }
        });
        res.json({ message: 'Notificación eliminada' });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
});
exports.deleteNotification = deleteNotification;
const createNotification = (userId_1, title_1, message_1, ...args_1) => __awaiter(void 0, [userId_1, title_1, message_1, ...args_1], void 0, function* (userId, title, message, type = 'INFO', oitId) {
    try {
        const notification = yield prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                oitId
            }
        });
        return notification;
    }
    catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
});
exports.createNotification = createNotification;
