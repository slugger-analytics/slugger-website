import { Router } from 'express';
import { getAllWidgets } from '../services/widgetService.js';
import { validationMiddleware } from '../middleware/validation-middleware.js';
import { queryParamasSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', validationMiddleware(queryParamasSchema), async (req, res) => {
    try {
        const { widgetName, categories, page, limit } = req.query;
        const widgets = await getAllWidgets(widgetName, categories, page, limit);
        res.status(200).json(widgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;