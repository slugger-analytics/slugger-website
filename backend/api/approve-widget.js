const express = require('express');
const router = express.Router();
const { getRequestData, createApprovedWidget, getUserData, generateApiKeyForUser, createUserWidgetRelation} = require('../services/widgetService');

router.post('/', async (req, res) => {
    const { requestId } = req.body;
    try {  
        const requestData = await getRequestData(requestId);
        const userCognitoID = requestData['user_id']
        const approvedWidgetID = await createApprovedWidget(requestData);
        const widgetID = approvedWidgetID['widget_id']
        const userData = await getUserData(userCognitoID)
        const userID = userData['user_id']
        const userEmail = userData['email']
        const apiKey = await generateApiKeyForUser(userID, userEmail);
        const userWidgetRelation = await createUserWidgetRelation(userID, widgetID, apiKey);
        
        res.status(200).json({ message: 'Widget approved and user-widget relation created successfully', userWidgetRelation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

