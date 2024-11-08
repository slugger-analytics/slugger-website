import { Router, Request, Response } from "express";
import { updateWidget } from "../services/widgetService";
import { validateParams } from '../middleware/validation-middleware';
import { editWidgetSchema } from "../validators/schemas"

const router = Router();

router.patch('/:id', validateParams(editWidgetSchema), async (req: Request, res: Response) => {
    console.log("got the request")
    const { name, description, link, visibility } = req.body;
    const widgetId = req.params.id;
    
    try {
        const result = await updateWidget(widgetId, name, description, link, visibility);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;