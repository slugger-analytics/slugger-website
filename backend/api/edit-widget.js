import { Router } from "express";
import { updateWidget } from "../services/widgetService.js";

const router = new Router();

router.put('/:id', async (req, res) => {
    const { title, description, link, visibility } = req.body;
    const widgetId = req.params.id;
    
    try {
        const result = await updateWidget(widgetId, title, description, link, visibility);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;