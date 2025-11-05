# IAM Setup Guide for SLUGGER

This guide explains how to set up IAM credentials for local development and configure ECS to use IAM roles for production.

## Overview

**Local Development**: Use permanent IAM user credentials
**Production (ECS)**: Use IAM roles attached to ECS tasks (no hardcoded credentials)

---

## Part 1: Create IAM User for Local Development

### Step 1: Create IAM User

```bash
# Via AWS Console:
# 1. Go to IAM → Users → Create user
# 2. User name: slugger-dev-user
# 3. Enable "Provide user access to the AWS Management Console" (optional)
# 4. Click Next

# Via AWS CLI:
aws iam create-user --user-name slugger-dev-user
```

### Step 2: Create Access Keys

```bash
# Via AWS Console:
# 1. Select the user → Security credentials tab
# 2. Create access key → Choose "Local code"
# 3. Download and save the credentials

# Via AWS CLI:
aws iam create-access-key --user-name slugger-dev-user
```

**Save these credentials immediately - they won't be shown again:**
- `AWS_ACCESS_KEY_ID`: AKIA... (permanent, starts with AKIA)
- `AWS_SECRET_ACCESS_KEY`: (secret key)

### Step 3: Attach Policies to IAM User

The user needs permissions for S3, SES, and Cognito:

```bash
# Create inline policy for the user
aws iam put-user-policy --user-name slugger-dev-user \
  --policy-name SluggerDevPolicy \
  --policy-document file://slugger-dev-policy.json
```

Create `slugger-dev-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:ListUsers"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-2:746669223415:userpool/*"
    }
  ]
}
```

### Step 4: Update Local .env File

Update your `.env` file with the permanent credentials:

```bash
AWS_ACCESS_KEY=AKIA... (your new permanent access key)
AWS_SECRET_ACCESS_KEY=... (your new secret key)
AWS_REGION=us-east-2
```

**Note**: Do NOT use session tokens for local development. Use permanent IAM user credentials.

---

## Part 2: Configure ECS Task Role (Production)

### Current Setup

Your ECS task already has a task role: `slugger-backend-task` (line 8 in task-definition-backend.json)

### Step 1: Verify/Update Task Role Permissions

The task role should have permissions for S3, SES, and Cognito. Check and update if needed:

```bash
# Get current role policy
aws iam list-attached-role-policies --role-name slugger-backend-task
aws iam list-role-policies --role-name slugger-backend-task

# If you need to create/update the policy:
aws iam put-role-policy --role-name slugger-backend-task \
  --policy-name SluggerBackendTaskPolicy \
  --policy-document file://task-role-policy.json
```

Create `task-role-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:ListUsers"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-2:746669223415:userpool/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:us-east-2:746669223415:parameter/slugger/*"
    }
  ]
}
```

### Step 2: Remove AWS Credentials from SSM Parameters

Since ECS will use the task role, you should remove the hardcoded AWS credentials from SSM:

```bash
# Delete the AWS credential parameters (they won't be needed in production)
aws ssm delete-parameter --name "/slugger/aws-access-key" --region us-east-2
aws ssm delete-parameter --name "/slugger/aws-secret-access-key" --region us-east-2
```

### Step 3: Update Task Definition

Remove AWS credentials from the secrets section since ECS will use the task role:

```bash
# Edit task-definition-backend.json and remove these lines from "secrets":
# { "name": "AWS_ACCESS_KEY", "valueFrom": "..." },
# { "name": "AWS_SECRET_ACCESS_KEY", "valueFrom": "..." },
```

The AWS SDK will automatically use the task role credentials when `AWS_ACCESS_KEY` is not provided.

---

## Part 3: Update Backend Code for Production

### Modify AWS Service Initialization

Update the backend code to use IAM roles when credentials are not explicitly provided:

**For S3 (league.js):**
```javascript
const s3Config = {
    region: process.env.AWS_REGION || "us-east-2"
};

// Only add explicit credentials if provided (local dev)
if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
}

const s3 = new S3Client(s3Config);
```

**For Cognito (cognito.js):**
```javascript
const cognitoConfig = {
    region: "us-east-2"
};

// Only add explicit credentials if provided (local dev)
if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY) {
    cognitoConfig.accessKeyId = process.env.AWS_ACCESS_KEY;
    cognitoConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

const cognito = new CognitoIdentityServiceProvider(cognitoConfig);
```

**For SES (emailService.js):**
```javascript
const sesConfig = {
    region: "us-east-2"
};

// Only add explicit credentials if provided (local dev)
if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY) {
    sesConfig.accessKeyId = process.env.AWS_ACCESS_KEY;
    sesConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

const ses = new SES(sesConfig);
```

---

## Part 4: Deployment Steps

### Step 1: Update Backend Code

Apply the code changes from Part 3 to all AWS service files.

### Step 2: Update Task Definition

```bash
# Remove AWS credential secrets from task-definition-backend.json
# Then register the new task definition:
aws ecs register-task-definition \
  --cli-input-json file://aws/task-definition-backend.json \
  --region us-east-2
```

### Step 3: Update ECS Service

```bash
# Force new deployment with updated task definition
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-backend-service \
  --force-new-deployment \
  --region us-east-2
```

### Step 4: Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster slugger-cluster \
  --services slugger-backend-service \
  --region us-east-2

# Check task logs
aws logs tail /ecs/slugger-backend --follow --region us-east-2
```

---

## Testing

### Local Development
```bash
# Ensure .env has permanent IAM user credentials
AWS_ACCESS_KEY=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2

# Start backend
cd backend
npm start

# Test league leaders endpoint
curl http://localhost:3001/api/league/leaders
```

### Production (ECS)
```bash
# The ECS task will automatically use the task role
# No AWS credentials needed in environment variables

# Test production endpoint
curl https://your-production-url.com/api/league/leaders
```

---

## Troubleshooting

### Issue: "Access Denied" in ECS
**Solution**: Verify the task role has the correct permissions:
```bash
aws iam get-role-policy --role-name slugger-backend-task --policy-name SluggerBackendTaskPolicy
```

### Issue: "Credentials not found" locally
**Solution**: Ensure `.env` file has valid IAM user credentials (AKIA...)

### Issue: "The security token included in the request is expired"
**Solution**: You're using temporary credentials. Create permanent IAM user credentials instead.

---

## Security Best Practices

1. **Never commit credentials to git** - `.env` is in `.gitignore`
2. **Use IAM roles for ECS** - No hardcoded credentials in production
3. **Rotate IAM user keys regularly** - Every 90 days
4. **Use least privilege** - Only grant necessary permissions
5. **Enable MFA** - For IAM users with console access
6. **Monitor usage** - Use CloudTrail to track API calls

---

## Summary

- **Local Dev**: IAM user with permanent credentials (AKIA...)
- **Production**: ECS task role (no credentials in code/env)
- **AWS SDK**: Automatically uses task role when credentials not provided
- **SSM**: Remove AWS credential parameters (not needed for ECS)
