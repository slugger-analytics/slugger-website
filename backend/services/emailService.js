import pkg from 'aws-sdk';
const { SES } = pkg;
const ses = new SES({ region: 'us-east-2' });

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
        Source: 'ALPB Analytics <noreply@alpb-analytics.com>'
    };

    try {
        await ses.sendEmail(params).promise();
        return 'Email sent successfully';
    } catch (err) {
        console.error('Error sending email:', err);
    }
}

export default sendApiKeyEmail;
