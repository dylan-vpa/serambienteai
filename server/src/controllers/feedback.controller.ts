import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/feedback
 * Submit feedback for AI-generated content
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            oitId,
            category,
            aiOutput,
            rating,
            feedbackType,
            fieldName,
            correctValue,
            notes
        } = req.body;

        if (!category || !feedbackType) {
            return res.status(400).json({ error: 'Category and feedbackType are required' });
        }

        const feedback = await prisma.aIFeedback.create({
            data: {
                oitId: oitId || null,
                category,
                aiOutput: aiOutput?.substring(0, 2000) || '', // Limit storage
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
    } catch (error) {
        console.error('[Feedback] Error saving feedback:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

/**
 * GET /api/feedback
 * Get all feedback, optionally filtered by category
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { category, oitId, limit = 50 } = req.query;

        const where: any = {};
        if (category) where.category = category;
        if (oitId) where.oitId = oitId;

        const feedback = await prisma.aIFeedback.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string)
        });

        res.json(feedback);
    } catch (error) {
        console.error('[Feedback] Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

/**
 * GET /api/feedback/corrections/:category
 * Get corrections for a specific category to use in AI prompts
 */
router.get('/corrections/:category', async (req: Request, res: Response) => {
    try {
        const { category } = req.params;

        const corrections = await prisma.aIFeedback.findMany({
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
    } catch (error) {
        console.error('[Feedback] Error fetching corrections:', error);
        res.status(500).json({ error: 'Failed to fetch corrections' });
    }
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const [total, byCategory, byType, avgRating] = await Promise.all([
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
            byCategory: byCategory.reduce((acc: Record<string, number>, c: any) => ({ ...acc, [c.category]: c._count }), {}),
            byType: byType.reduce((acc: Record<string, number>, t: any) => ({ ...acc, [t.feedbackType]: t._count }), {}),
            averageRating: avgRating._avg.rating || 0
        });
    } catch (error) {
        console.error('[Feedback] Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
