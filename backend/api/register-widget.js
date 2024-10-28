const express = require('express');
const { registerWidget } = require('../services/widgetService');
const router = express.Router();
const jwt = require('jsonwebtoken');  // To decode the JWT token

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



module.exports = router;

