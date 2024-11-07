import { Router } from 'express';
import { registerWidget } from '../services/widgetService.js';

const router = Router();

router.post('/', async (req, res) => {
    const { widgetName, description, visibility, userId } = req.body;
    try {
        // Use userId to associate the widget with the correct user
        const result = await registerWidget(userId, widgetName, description, visibility);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



export default router;

