# Quick Setup: IAM Credentials & ECS Roles

## Step 1: Create IAM User for Local Development

```bash
# 1. Create IAM user
aws iam create-user --user-name slugger-dev-user

# 2. Create access keys (SAVE THESE - they won't be shown again!)
aws iam create-access-key --user-name slugger-dev-user

# 3. Create policy file
cat > /tmp/slugger-dev-policy.json << 'EOF'
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
        "arn:aws:s3:::slugger-json-data-bucket",
        "arn:aws:s3:::slugger-json-data-bucket/*"
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
EOF

# 4. Attach policy to user
aws iam put-user-policy \
  --user-name slugger-dev-user \
  --policy-name SluggerDevPolicy \
  --policy-document file:///tmp/slugger-dev-policy.json
```

## Step 2: Update Local .env File

Update your `.env` file with the permanent credentials from Step 1:

```bash
AWS_ACCESS_KEY=AKIA... (from step 1)
AWS_SECRET_ACCESS_KEY=... (from step 1)
AWS_REGION=us-east-2
```

## Step 3: Configure ECS Task Role

```bash
# 1. Create/update task role policy
cat > /tmp/task-role-policy.json << 'EOF'
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
        "arn:aws:s3:::slugger-json-data-bucket",
        "arn:aws:s3:::slugger-json-data-bucket/*"
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
EOF

# 2. Attach policy to ECS task role
aws iam put-role-policy \
  --role-name slugger-backend-task \
  --policy-name SluggerBackendTaskPolicy \
  --policy-document file:///tmp/task-role-policy.json \
  --region us-east-2
```

## Step 4: Deploy Updated Task Definition

```bash
# 1. Register new task definition (AWS credentials removed)
aws ecs register-task-definition \
  --cli-input-json file://aws/task-definition-backend.json \
  --region us-east-2

# 2. Update ECS service with new task definition
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-backend-service \
  --force-new-deployment \
  --region us-east-2

# 3. Monitor deployment
aws ecs describe-services \
  --cluster slugger-cluster \
  --services slugger-backend-service \
  --region us-east-2 \
  --query 'services[0].deployments'
```

## Step 5: Clean Up (Optional)

Remove old AWS credential parameters from SSM (no longer needed):

```bash
# These are optional - only delete if you're sure ECS is using task role
aws ssm delete-parameter --name "/slugger/aws-access-key" --region us-east-2
aws ssm delete-parameter --name "/slugger/aws-secret-access-key" --region us-east-2
aws ssm delete-parameter --name "/slugger/aws-region" --region us-east-2
```

## Verification

### Test Local Development

```bash
cd backend
npm start

# Test league leaders endpoint
curl http://localhost:3001/api/league/leaders
```

### Test Production

```bash
# Check ECS task logs
aws logs tail /ecs/slugger-backend --follow --region us-east-2

# Test production endpoint
curl https://your-production-url.com/api/league/leaders
```

## Troubleshooting

### "Access Denied" in ECS

Check task role permissions:

```bash
aws iam get-role-policy \
  --role-name slugger-backend-task \
  --policy-name SluggerBackendTaskPolicy
```

### "Credentials not found" locally

Verify `.env` has valid IAM user credentials (starts with AKIA)

### Service won't update

Force stop old tasks:

```bash
# List tasks
aws ecs list-tasks --cluster slugger-cluster --region us-east-2

# Stop old task
aws ecs stop-task --cluster slugger-cluster --task <task-id> --region us-east-2
```

## Summary

✅ **Backend code updated** - Uses IAM roles in production, credentials in local dev
✅ **Task definition updated** - AWS credentials removed from secrets
✅ **IAM setup ready** - Follow steps above to create user and configure roles

**Next**: Run the commands in Steps 1-4 to complete the setup.
