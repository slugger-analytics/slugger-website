#!/bin/bash
# Comprehensive Testing Script for Pitches Endpoint
# Tests for 502 errors and common failure modes

set -e

# Configuration
PITCHES_URL="${PITCHES_URL:-https://1ywv9dczq5.execute-api.us-east-2.amazonaws.com/ALPBAPI/pitches}"
AWS_REGION="${AWS_REGION:-us-east-2}"
API_KEY="${API_KEY:-}"

# Check if API_KEY is set
if [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}⚠ Warning: API_KEY environment variable not set${NC}"
    echo "  Some tests will fail due to 403 Forbidden errors"
    echo "  Set API key with: export API_KEY='7dg8hSpEdW4EUoW8ezYMu8MaUVemc0Wb8GCNl24G'"
    echo ""
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Pitches Endpoint Testing Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Testing endpoint: $PITCHES_URL"
echo ""

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    local expected=$3
    
    echo -n "Testing: $test_name... "
    
    result=$(eval "$test_command" 2>&1 || echo "ERROR")
    
    if [[ "$result" == *"$expected"* ]]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: $result"
        ((TESTS_FAILED++))
        return 1
    fi
}

# ============================================================================
# TEST 1: Basic Connectivity
# ============================================================================
echo -e "${YELLOW}=== TEST 1: Basic Connectivity ===${NC}"

if [ -n "$API_KEY" ]; then
    HTTP_CODE=$(curl -s -H "x-api-key: $API_KEY" -o /tmp/pitches_response.json -w "%{http_code}" "$PITCHES_URL")
else
    HTTP_CODE=$(curl -s -o /tmp/pitches_response.json -w "%{http_code}" "$PITCHES_URL")
fi
echo "HTTP Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Endpoint is responding${NC}"
    ((TESTS_PASSED++))
elif [ "$HTTP_CODE" = "502" ]; then
    echo -e "${RED}✗ 502 Bad Gateway Error!${NC}"
    echo "  This indicates a Lambda or database issue"
    ((TESTS_FAILED++))
elif [ "$HTTP_CODE" = "504" ]; then
    echo -e "${RED}✗ 504 Gateway Timeout!${NC}"
    echo "  Lambda execution time exceeded"
    ((TESTS_FAILED++))
else
    echo -e "${YELLOW}⚠ Unexpected status code: $HTTP_CODE${NC}"
fi

echo "Response preview:"
head -c 200 /tmp/pitches_response.json
echo ""
echo ""

# ============================================================================
# TEST 2: Parameter Testing
# ============================================================================
echo -e "${YELLOW}=== TEST 2: Parameter Testing ===${NC}"

# Test 2a: Limit parameter
if [ -n "$API_KEY" ]; then
    HTTP_CODE=$(curl -s -H "x-api-key: $API_KEY" -o /tmp/pitches_limit.json -w "%{http_code}" "$PITCHES_URL?limit=10")
else
    HTTP_CODE=$(curl -s -o /tmp/pitches_limit.json -w "%{http_code}" "$PITCHES_URL?limit=10")
fi
echo -n "With limit=10: "
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ (HTTP $HTTP_CODE)${NC}"
    ((TESTS_FAILED++))
fi

# Test 2b: Offset parameter
if [ -n "$API_KEY" ]; then
    HTTP_CODE=$(curl -s -H "x-api-key: $API_KEY" -o /tmp/pitches_offset.json -w "%{http_code}" "$PITCHES_URL?limit=10&offset=10")
else
    HTTP_CODE=$(curl -s -o /tmp/pitches_offset.json -w "%{http_code}" "$PITCHES_URL?limit=10&offset=10")
fi
echo -n "With offset=10: "
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ (HTTP $HTTP_CODE)${NC}"
    ((TESTS_FAILED++))
fi

# Test 2c: Game ID filter
if [ -n "$API_KEY" ]; then
    HTTP_CODE=$(curl -s -H "x-api-key: $API_KEY" -o /tmp/pitches_game.json -w "%{http_code}" "$PITCHES_URL?game_id=1&limit=10")
else
    HTTP_CODE=$(curl -s -o /tmp/pitches_game.json -w "%{http_code}" "$PITCHES_URL?game_id=1&limit=10")
fi
echo -n "With game_id=1: "
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    echo -e "${GREEN}✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ (HTTP $HTTP_CODE)${NC}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# TEST 3: Response Time
# ============================================================================
echo -e "${YELLOW}=== TEST 3: Response Time ===${NC}"

echo "Measuring response time for 5 requests..."

total_time=0
for i in {1..5}; do
    if [ -n "$API_KEY" ]; then
        response_time=$(curl -s -H "x-api-key: $API_KEY" -o /dev/null -w "%{time_total}" "$PITCHES_URL?limit=10")
    else
        response_time=$(curl -s -o /dev/null -w "%{time_total}" "$PITCHES_URL?limit=10")
    fi
    total_time=$(echo "$total_time + $response_time" | bc)
    echo "  Request $i: ${response_time}s"
done

avg_time=$(echo "scale=3; $total_time / 5" | bc)
echo "Average response time: ${avg_time}s"

if (( $(echo "$avg_time < 3" | bc -l) )); then
    echo -e "${GREEN}✓ Response time is acceptable${NC}"
    ((TESTS_PASSED++))
elif (( $(echo "$avg_time < 5" | bc -l) )); then
    echo -e "${YELLOW}⚠ Response time is slow but acceptable${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ Response time is too slow (> 5s)${NC}"
    echo "  Possible causes: Database query optimization needed"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# TEST 4: Response Size
# ============================================================================
echo -e "${YELLOW}=== TEST 4: Response Size ===${NC}"

if [ -n "$API_KEY" ]; then
    response_size=$(curl -s -H "x-api-key: $API_KEY" "$PITCHES_URL?limit=10" | wc -c)
else
    response_size=$(curl -s "$PITCHES_URL?limit=10" | wc -c)
fi
echo "Response size: $response_size bytes"

if [ "$response_size" -gt 100 ]; then
    echo -e "${GREEN}✓ Response contains data${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ Response is too small (might be empty)${NC}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# TEST 5: Concurrent Requests
# ============================================================================
echo -e "${YELLOW}=== TEST 5: Concurrent Requests ===${NC}"

echo "Sending 20 concurrent requests..."

failed_count=0
for i in {1..20}; do
    if [ -n "$API_KEY" ]; then
        HTTP_CODE=$(curl -s -H "x-api-key: $API_KEY" -o /dev/null -w "%{http_code}" "$PITCHES_URL?limit=5")
    else
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PITCHES_URL?limit=5")
    fi
    if [ "$HTTP_CODE" != "200" ]; then
        ((failed_count++))
        echo "  Request $i: Failed (HTTP $HTTP_CODE)"
    else
        echo -n "."
    fi
done

echo ""

if [ "$failed_count" = "0" ]; then
    echo -e "${GREEN}✓ All concurrent requests succeeded${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ $failed_count out of 20 requests failed${NC}"
    echo "  Possible causes: Connection pool exhaustion, Lambda concurrency limits"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# TEST 6: Load Testing (if ab is available)
# ============================================================================
echo -e "${YELLOW}=== TEST 6: Load Testing ===${NC}"

if command -v ab &> /dev/null; then
    echo "Running Apache Bench (100 requests, 10 concurrent)..."
    if [ -n "$API_KEY" ]; then
        ab -H "x-api-key: $API_KEY" -n 100 -c 10 -q "$PITCHES_URL?limit=10" > /tmp/ab_results.txt 2>&1
    else
        ab -n 100 -c 10 -q "$PITCHES_URL?limit=10" > /tmp/ab_results.txt 2>&1
    fi
    
    failed=$(grep -o "Failed requests:" /tmp/ab_results.txt | wc -l)
    if [ "$failed" = "0" ] || grep -q "Failed requests:.*0" /tmp/ab_results.txt; then
        echo -e "${GREEN}✓ Load test passed${NC}"
        ((TESTS_PASSED++))
        
        # Show performance metrics
        echo "Performance metrics:"
        grep -E "Requests per second|Time per request|Transfer rate" /tmp/ab_results.txt | sed 's/^/  /'
    else
        echo -e "${RED}✗ Load test failed${NC}"
        ((TESTS_FAILED++))
        grep "Failed requests:" /tmp/ab_results.txt | sed 's/^/  /'
    fi
else
    echo -e "${YELLOW}⚠ Apache Bench not installed (skipped)${NC}"
    echo "  To install: brew install httpd (Mac) or apt-get install apache2-utils (Linux)"
fi

echo ""

# ============================================================================
# TEST 7: CloudWatch Logs
# ============================================================================
echo -e "${YELLOW}=== TEST 7: CloudWatch Logs Analysis ===${NC}"

if command -v aws &> /dev/null; then
    echo "Checking recent Lambda logs for errors..."
    
    error_count=$(aws logs filter-log-events \
        --log-group-name /aws/lambda/pitches_endpoint \
        --start-time $(($(date +%s) - 300))000 \
        --filter-pattern "ERROR" \
        --query 'events | length(@)' \
        2>/dev/null || echo "0")
    
    timeout_count=$(aws logs filter-log-events \
        --log-group-name /aws/lambda/pitches_endpoint \
        --start-time $(($(date +%s) - 300))000 \
        --filter-pattern "timeout" \
        --query 'events | length(@)' \
        2>/dev/null || echo "0")
    
    if [ "$error_count" = "0" ] && [ "$timeout_count" = "0" ]; then
        echo -e "${GREEN}✓ No errors or timeouts in last 5 minutes${NC}"
        ((TESTS_PASSED++))
    elif [ "$timeout_count" -gt "0" ]; then
        echo -e "${RED}✗ Found $timeout_count timeout errors${NC}"
        echo "  Solution: Increase Lambda timeout or optimize queries"
        ((TESTS_FAILED++))
    elif [ "$error_count" -gt "0" ]; then
        echo -e "${RED}✗ Found $error_count errors${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ AWS CLI not installed (skipped)${NC}"
fi

echo ""

# ============================================================================
# TEST 8: Database Connection Check
# ============================================================================
echo -e "${YELLOW}=== TEST 8: Database Connection ===${NC}"

if command -v aws &> /dev/null; then
    echo "Checking RDS instance status..."
    
    db_status=$(aws rds describe-db-instances \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text \
        2>/dev/null || echo "unknown")
    
    echo "RDS Status: $db_status"
    
    if [ "$db_status" = "available" ]; then
        echo -e "${GREEN}✓ Database is available${NC}"
        ((TESTS_PASSED++))
    elif [ "$db_status" = "unknown" ]; then
        echo -e "${YELLOW}⚠ Could not determine status (check IAM permissions)${NC}"
    else
        echo -e "${RED}✗ Database is not available: $db_status${NC}"
        echo "  This would cause 502 errors!"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ AWS CLI not installed (skipped)${NC}"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo "The pitches endpoint appears to be working correctly."
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check CloudWatch logs: aws logs tail /aws/lambda/pitches_endpoint --follow"
    echo "2. Check RDS status: aws rds describe-db-instances"
    echo "3. Review TESTING-PITCHES-ENDPOINT.md for detailed debugging"
fi

echo ""
echo "For detailed information, see: TESTING-PITCHES-ENDPOINT.md"
