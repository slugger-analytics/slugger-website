import { Router } from 'express';
import { getPendingWidgets } from '../services/widgetService.js';
const router = Router();

router.get('/', async (req, res) => {
    try {
        const widgets = await getPendingWidgets();
        res.status(200).json(widgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;