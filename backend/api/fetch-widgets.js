import { Router } from 'express';
import { getAllWidgets } from '../services/widgetService.js';
const router = Router();

router.get('/', async (req, res) => {
    try {
        const widgets = await getAllWidgets();
        res.status(200).json(widgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;