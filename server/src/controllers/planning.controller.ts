import { Request, Response } from 'express';
import planningService from '../services/planning.service';

export const generatePlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const proposal = await planningService.generateProposal(id);
        res.json(proposal);
    } catch (error) {
        console.error('Error generating planning:', error);
        res.status(500).json({ error: 'Error al generar planeación' });
    }
};

export const acceptPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await planningService.acceptProposal(id);
        res.json({ message: 'Planeación aceptada' });
    } catch (error) {
        console.error('Error accepting planning:', error);
        res.status(500).json({ error: 'Error al aceptar planeación' });
    }
};

export const rejectPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await planningService.rejectProposal(id);
        res.json({ message: 'Planeación rechazada' });
    } catch (error) {
        console.error('Error rejecting planning:', error);
        res.status(500).json({ error: 'Error al rechazar planeación' });
    }
};
