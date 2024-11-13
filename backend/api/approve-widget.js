import express from 'express';
import { getRequestData, createApprovedWidget, getUserData, generateApiKeyForUser, createUserWidgetRelation} from '../services/widgetService.js';
import sendApiKeyEmail from '../services/emailService.js'
import { request } from 'http';
const router = express.Router();

router.post('/', async (req, res) => {
    const { requestId } = req.body;
    try { 
        console.log("resquestId:", req.body);
        const requestData = await getRequestData(requestId);
        console.log("requestData:", requestData);
        const userCognitoID = requestData['user_id']
        const approvedWidgetID = await createApprovedWidget(requestData);
        const widgetID = approvedWidgetID['widget_id']
        const userData = await getUserData(userCognitoID)
        const userID = userData['user_id']
        const userEmail = userData['email']
        const apiKey = await generateApiKeyForUser(userID, userEmail);
        const userWidgetRelation = await createUserWidgetRelation(userID, widgetID, apiKey);
        const email = await sendApiKeyEmail(userEmail, apiKey)
        res.status(200).json({ message: 'Widget approved, user-widget relation created, and API key sent via email', userWidgetRelation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
