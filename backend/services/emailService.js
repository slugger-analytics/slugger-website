const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: 'us-east-2' });

async function sendApiKeyEmail(email, apiKey) {
    const params = {
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Body: {
                Text: {
                    Data: `Here is your API key: ${apiKey}`
                }
            },
            Subject: {
                Data: 'Your ALPB Widget API Key'
            }
        },
        Source: 'your-email@example.com'
    };

    try {
        await ses.sendEmail(params).promise();
        console.log('Email sent successfully');
    } catch (err) {
        console.error('Error sending email:', err);
    }
}

module.exports = { sendApiKeyEmail };
