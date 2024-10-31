const express = require('express');
const { getUserData } = require('../services/widgetService');
const router = express.Router();

router.get('/', async (req, res) => {
    const {id} = req.body;
    try {
        const user = await getUserData(id);
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;