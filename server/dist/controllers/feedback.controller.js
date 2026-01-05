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
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/**
 * POST /api/feedback
 * Submit feedback for AI-generated content
 */
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { oitId, category, aiOutput, rating, feedbackType, fieldName, correctValue, notes } = req.body;
        if (!category || !feedbackType) {
            return res.status(400).json({ error: 'Category and feedbackType are required' });
        }
        const feedback = yield prisma.aIFeedback.create({
            data: {
                oitId: oitId || null,
                category,
                aiOutput: (aiOutput === null || aiOutput === void 0 ? void 0 : aiOutput.substring(0, 2000)) || '', // Limit storage
                rating: rating || 0,
                feedbackType,
                fieldName: fieldName || null,
                correctValue: correctValue || null,
                notes: notes || null,
                applied: false
            }
        });
        console.log(`[Feedback] New ${feedbackType} feedback for ${category}`);
        res.status(201).json(feedback);
    }
    catch (error) {
        console.error('[Feedback] Error saving feedback:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
}));
/**
 * GET /api/feedback
 * Get all feedback, optionally filtered by category
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, oitId, limit = 50 } = req.query;
        const where = {};
        if (category)
            where.category = category;
        if (oitId)
            where.oitId = oitId;
        const feedback = yield prisma.aIFeedback.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
        });
        res.json(feedback);
    }
    catch (error) {
        console.error('[Feedback] Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
}));
/**
 * GET /api/feedback/corrections/:category
 * Get corrections for a specific category to use in AI prompts
 */
router.get('/corrections/:category', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category } = req.params;
        const corrections = yield prisma.aIFeedback.findMany({
            where: {
                category,
                feedbackType: { in: ['PARTIAL', 'WRONG'] },
                correctValue: { not: null }
            },
            select: {
                fieldName: true,
                correctValue: true,
                notes: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json(corrections);
    }
    catch (error) {
        console.error('[Feedback] Error fetching corrections:', error);
        res.status(500).json({ error: 'Failed to fetch corrections' });
    }
}));
/**
 * GET /api/feedback/stats
 * Get feedback statistics
 */
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [total, byCategory, byType, avgRating] = yield Promise.all([
            prisma.aIFeedback.count(),
            prisma.aIFeedback.groupBy({
                by: ['category'],
                _count: true
            }),
            prisma.aIFeedback.groupBy({
                by: ['feedbackType'],
                _count: true
            }),
            prisma.aIFeedback.aggregate({
                _avg: { rating: true }
            })
        ]);
        res.json({
            total,
            byCategory: byCategory.reduce((acc, c) => (Object.assign(Object.assign({}, acc), { [c.category]: c._count })), {}),
            byType: byType.reduce((acc, t) => (Object.assign(Object.assign({}, acc), { [t.feedbackType]: t._count })), {}),
            averageRating: avgRating._avg.rating || 0
        });
    }
    catch (error) {
        console.error('[Feedback] Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
}));
exports.default = router;
