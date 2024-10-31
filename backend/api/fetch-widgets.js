const express = require('express');
const { getAllWidgets } = require('../services/widgetService');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const widgets = await getAllWidgets();
        res.status(200).json(widgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;