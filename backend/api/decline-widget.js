const express = require('express');
const router = express.Router();
const { removeRequest } = require('../services/widgetService');

router.post('/', async (req, res) => {
    const { requestId } = req.body;

    try {  
        // Remove the request from the database
        const removedRequest = await removeRequest(requestId);

        // Send success response
        res.status(200).json({ message: 'Request declined and removed', removedRequest });
    } catch (error) {
        // Handle error response
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
