import { Router } from "express";
import { favoriteWidget, getFavorites, unfavoriteWidget } from "../services/userService.js";
import { validationMiddleware } from '../middleware/validation-middleware.js';
import { updateUserSchema, favoriteWidgetSchema } from "../validators/schemas.js";

const router = Router();

router.patch('/add-favorite/:userId', 
    // validationMiddleware(updateUserSchema),
    // validationMiddleware(favoriteWidgetSchema),
    async (req, res) => {
        const userId = parseInt(req.params.userId)
        const widgetId = parseInt(req.body.widgetId);
        try {
            const result = await favoriteWidget(userId, widgetId);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

router.patch('/remove-favorite/:userId', 
    // validationMiddleware(updateUserSchema),
    // validationMiddleware(favoriteWidgetSchema),
    async (req, res) => {
        const userId = parseInt(req.params.userId);
        const widgetId = parseInt(req.body.widgetId);
        try {
            const result = await unfavoriteWidget(userId, widgetId);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

router.get('/:userId',
    async (req, res) => {
        const userId = parseInt(req.params.userId)
        try {
            const result = await getFavorites(userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
)

export default router;