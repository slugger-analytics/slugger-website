#!/bin/bash
# Script to diagnose and fix database connectivity issues in ECS Fargate deployment

set -e

REGION="us-east-2"
ECS_SG="sg-0c985525970ae7372"  # ECS tasks security group
DB_CLUSTER="alpb-1"

echo "=================================================="
echo "Database Connectivity Diagnostic Script"
echo "=================================================="
echo ""

# Step 1: Get RDS security group
echo "Step 1: Finding RDS security group..."
RDS_SG=$(aws rds describe-db-clusters \
  --db-cluster-identifier $DB_CLUSTER \
  --region $REGION \
  --query 'DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

echo "✓ RDS Security Group: $RDS_SG"
echo ""

# Step 2: Check if rule exists
echo "Step 2: Checking if PostgreSQL port (5432) is allowed from ECS tasks..."
EXISTING_RULE=$(aws ec2 describe-security-groups \
  --group-ids $RDS_SG \
  --region $REGION \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`5432\` && ToPort==\`5432\`].UserIdGroupPairs[?GroupId=='$ECS_SG'].GroupId" \
  --output text || echo "")

if [ -n "$EXISTING_RULE" ]; then
  echo "✓ Security group rule already exists!"
  echo "  Rule: Allow port 5432 from $ECS_SG to $RDS_SG"
else
  echo "✗ Security group rule is MISSING!"
  echo ""
  echo "Step 3: Adding security group rule..."
  
  aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG \
    --protocol tcp \
    --port 5432 \
    --source-group $ECS_SG \
    --region $REGION
  
  echo "✓ Security group rule added successfully!"
  echo "  Rule: Allow port 5432 from $ECS_SG to $RDS_SG"
fi

echo ""
echo "=================================================="
echo "Diagnostic Summary"
echo "=================================================="
echo "✓ ECS Security Group: $ECS_SG"
echo "✓ RDS Security Group: $RDS_SG"
echo "✓ Port 5432 access: Configured"
echo ""
echo "Next steps:"
echo "1. Deploy the updated backend code (health check fix)"
echo "2. Wait for new ECS tasks to start"
echo "3. Check /api/health endpoint - should show database: connected"
echo "4. Monitor CloudWatch logs for any connection errors"
echo ""
echo "To deploy: git add . && git commit -m 'Fix database health check' && git push"
echo "=================================================="
