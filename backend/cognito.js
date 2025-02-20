import pkg from "aws-sdk";
const { CognitoIdentityServiceProvider } = pkg;

const cognito = new CognitoIdentityServiceProvider({ 
  region: "us-east-2" 
});

export default cognito; 