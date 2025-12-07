import pkg from "aws-sdk";
const { CognitoIdentityServiceProvider } = pkg;

// Enable loading from AWS config file if AWS_CONFIG_FILE is set
// This allows credentials to be loaded from ~/.aws/config
if (process.env.AWS_CONFIG_FILE && !process.env.AWS_SDK_LOAD_CONFIG) {
  process.env.AWS_SDK_LOAD_CONFIG = '1';
}

// Configure Cognito - uses default credential provider chain which checks:
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_ACCESS_KEY/AWS_SECRET_ACCESS_KEY)
// 2. Shared credentials file (~/.aws/credentials)
// 3. Shared config file (~/.aws/config) if AWS_SDK_LOAD_CONFIG=1
// 4. IAM role (for ECS/EC2 in production)
const cognitoConfig = {
  region: process.env.AWS_REGION || "us-east-2"
};

// Only add explicit credentials if provided (for local development)
// In production (ECS), the SDK will automatically use the task role
if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY) {
  cognitoConfig.accessKeyId = process.env.AWS_ACCESS_KEY;
  cognitoConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

const cognito = new CognitoIdentityServiceProvider(cognitoConfig);

export default cognito; 