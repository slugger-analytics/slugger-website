import express, { json } from 'express';
import cors from 'cors';  // Enable if frontend and backend are on different domains
import dotenv from "dotenv";
dotenv.config();  // Load environment variables

import registerWidgetRoute from './api/register-widget.js';
import approveWidgetRoute from './api/approve-widget.js';
import registerUserRoute from './api/register-user.js';
import loginUserRoute from './api/login-user.js';
import pendingWidgets from './api/pending-widgets.js';
import declineRequestRoute from './api/decline-widget.js';
import fetchAllWidgetRoute from './api/fetch-widgets.js';
import fetchUserByCognitoId from './api/fetch-user.js';
import editWidgetRouter from './api/edit-widget.js';
import userFavoritesRouter from './api/user-favorites.js';

const app = express();

app.use(cors());  // Enable CORS if necessary
app.use(json());  // Parse incoming JSON requests

// Register routes
app.use('/api/register-widget', registerWidgetRoute);
app.use('/api/approve-widget', approveWidgetRoute);
app.use('/api/register-user', registerUserRoute);
app.use('/api/login-user', loginUserRoute);
app.use('/api/pending-widgets', pendingWidgets)
app.use('/api/decline-widget', declineRequestRoute)
app.use('/api/fetch-widgets', fetchAllWidgetRoute)
app.use('/api/fetch-user', fetchUserByCognitoId)
app.use('/api/edit-widget', editWidgetRouter)
app.use('/api/user-favorites', userFavoritesRouter)
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

