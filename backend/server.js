const express = require('express');
const cors = require('cors');  // Enable if frontend and backend are on different domains
require('dotenv').config();  // Load environment variables

const registerWidgetRoute = require('./api/register-widget');
const approveWidgetRoute = require('./api/approve-widget');
const registerUserRoute = require('./api/register-user');
const loginUserRoute = require('./api/login-user');
const pendingWidgets = require('./api/pending-widgets');
const declineRequestRoute = require('./api/decline-widget')
const fetchAllWidgetRoute = require ('./api/fetch-widgets')

const app = express();

app.use(cors());  // Enable CORS if necessary
app.use(express.json());  // Parse incoming JSON requests

// Register routes
app.use('/api/register-widget', registerWidgetRoute);
app.use('/api/approve-widget', approveWidgetRoute);
app.use('/api/register-user', registerUserRoute);
app.use('/api/login-user', loginUserRoute);
app.use('/api/pending-widgets', pendingWidgets)
app.use('/api/decline-widget', declineRequestRoute)
app.use('/api/fetch-widgets', fetchAllWidgetRoute)
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

