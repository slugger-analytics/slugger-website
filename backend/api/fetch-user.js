import { Router } from 'express';
import { getUserData } from '../services/widgetService.js';

const router = Router();

router.get('/', async (req, res) => {
    const {id} = req.body;
    try {
        const user = await getUserData(id);
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;