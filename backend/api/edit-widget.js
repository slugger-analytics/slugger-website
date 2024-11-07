import { Router } from "express";
import { updateWidget } from "../services/widgetService.js";

const router = new Router();

router.post('/', async (req, res) => {
    const { widgetId, title, description, link, visibility } = req.body();
    try {
        const result = await updateWidget(widgetId, title, description, link, visibility);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;