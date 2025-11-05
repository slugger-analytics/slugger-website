import pkg from "aws-sdk";
const { CognitoIdentityServiceProvider } = pkg;

// Configure Cognito - uses IAM role in production, explicit credentials in local dev
const cognitoConfig = {
  region: "us-east-2"
};

// Only add explicit credentials if provided (for local development)
// In production (ECS), the SDK will automatically use the task role
if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY) {
  cognitoConfig.accessKeyId = process.env.AWS_ACCESS_KEY;
  cognitoConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

const cognito = new CognitoIdentityServiceProvider(cognitoConfig);

export default cognito; 