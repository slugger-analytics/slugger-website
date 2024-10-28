const express = require('express');
const { getPendingWidgets } = require('../services/widgetService');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const widgets = await getPendingWidgets();
        res.status(200).json(widgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;