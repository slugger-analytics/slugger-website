/**
 * Utility for sending emails via AWS SES.
 * Sends an email containing an API key to the specified recipient using Amazon Simple Email Service (SES).
 */

import pkg from "aws-sdk"; // Import AWS SDK
const { SES } = pkg; // Extract the SES (Simple Email Service) class

// Initialize an SES instance with the specified AWS region
const ses = new SES({ region: "us-east-2" });

/**
 * Sends an email containing an API key to the specified recipient.
 *
 * @param {string} email - The recipient's email address.
 * @param {string} apiKey - The API key to be sent in the email body.
 * @returns {Promise<string>} - A success message if the email is sent successfully.
 * @throws {Error} - Logs and throws an error if the email fails to send.
 */
export async function sendApiKeyEmail(email, apiKey) {
  // Define the email parameters
  const params = {
    Destination: {
      ToAddresses: [email], // Recipient's email address
    },
    Message: {
      Body: {
        Text: {
          Data: `
          Hello, your developer account has been approved.
          Here is your API key: ${apiKey}`, // Email body containing the API key
        },
      },
      Subject: {
        Data: "ALPB Developer Account Approved", // Subject line of the email
      },
    },
    Source: "ALPB Analytics <noreply@alpb-analytics.com>", // Sender's email address
  };

  try {
    // Send the email using AWS SES
    await ses.sendEmail(params).promise();
    return "Email sent successfully"; // Return a success message
  } catch (err) {
    // Log the error and rethrow it
    console.error("Error sending email:", err);
    throw new Error("Failed to send email");
  }
}

export async function sendPasswordResetEmail(email, otp) {
  const params = {
    Destination: {
      ToAddresses: [email], // Recipient's email address
    },
    Message: {
      Body: {
        Text: {
          Data: `
          Use this code to reset your password: ${otp}
          `
        },
      },
      Subject: {
        Data: "Reset Your Password", // Subject line of the email
      },
    },
    Source: "ALPB Analytics <noreply@alpb-analytics.com>", // Sender's email address
  };
  try {
    // Send the email using AWS SES
    console.log("Trying to send email...")
    await ses.sendEmail(params).promise();
    console.log("Email sent successfully!")
    return "Email sent successfully"; // Return a success message
  } catch (err) {
    // Log the error and rethrow it
    console.error("Error sending email:", err);
    throw new Error("Failed to send email");
  }
}

