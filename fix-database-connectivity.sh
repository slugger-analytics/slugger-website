#!/bin/bash
# Quick Fix Script for Database Connectivity
# Run this after setting AWS_PAGER="" in your shell

set -e

echo "======================================================"
echo "SLUGGER Database Connectivity Fix"
echo "======================================================"
echo ""

# Disable AWS CLI pager
export AWS_PAGER=""

REGION="us-east-2"
ECS_SG="sg-0c985525970ae7372"
DB_CLUSTER="alpb-1"

# Step 1: Get RDS Security Group
echo "[1/4] Getting RDS security group ID..."
RDS_SG=$(aws rds describe-db-clusters \
  --db-cluster-identifier $DB_CLUSTER \
  --region $REGION \
  --query 'DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

if [ -z "$RDS_SG" ]; then
  echo "❌ ERROR: Could not find RDS security group"
  exit 1
fi

echo "✓ RDS Security Group: $RDS_SG"
echo ""

# Step 2: Check current rules
echo "[2/4] Checking existing security group rules..."
aws ec2 describe-security-groups \
  --group-ids $RDS_SG \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432`]' \
  --output table

echo ""

# Step 3: Check if our rule exists
echo "[3/4] Checking if ECS tasks can access RDS..."
RULE_EXISTS=$(aws ec2 describe-security-groups \
  --group-ids $RDS_SG \
  --region $REGION \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`5432\` && ToPort==\`5432\`].UserIdGroupPairs[?GroupId=='$ECS_SG'].GroupId" \
  --output text)

if [ -n "$RULE_EXISTS" ]; then
  echo "✓ Security group rule already exists!"
  echo "  Port 5432 is accessible from ECS tasks ($ECS_SG)"
  echo ""
  echo "The network configuration is correct."
  echo "The issue might be:"
  echo "  1. Wrong DB_HOST in SSM parameters"
  echo "  2. Wrong DB credentials"
  echo "  3. Database is actually down"
  echo ""
  echo "Check CloudWatch logs for detailed error:"
  echo "  aws logs tail /ecs/slugger-backend --follow --region us-east-2"
else
  echo "❌ Security group rule is MISSING!"
  echo ""
  echo "[4/4] Adding security group rule..."
  
  aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG \
    --protocol tcp \
    --port 5432 \
    --source-group $ECS_SG \
    --region $REGION
  
  echo "✓ Security group rule added successfully!"
  echo "  Rule: Allow TCP port 5432"
  echo "  From: $ECS_SG (ECS tasks)"
  echo "  To: $RDS_SG (RDS database)"
fi

echo ""
echo "======================================================"
echo "Next Steps:"
echo "======================================================"
echo "1. Deploy updated backend code:"
echo "   git add backend/server.js DATABASE-FIX-GUIDE.md"
echo "   git commit -m 'Fix health check and add database diagnostics'"
echo "   git push"
echo ""
echo "2. Wait for deployment (2-3 minutes)"
echo "   Watch: gh run watch"
echo ""
echo "3. Test the health endpoint:"
echo "   curl http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/api/health | jq"
echo ""
echo "4. If still failing, check logs:"
echo "   aws logs tail /ecs/slugger-backend --follow --region us-east-2"
echo "======================================================"
