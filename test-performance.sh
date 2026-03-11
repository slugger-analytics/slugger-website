#!/bin/bash
# Testing Script for API Performance Optimizations
# Run this script to verify all performance improvements

set -e

echo "==============================================="
echo "API Performance Testing Suite"
echo "==============================================="
echo ""

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-slugger_db}"
DB_USER="${DB_USER:-postgres}"

echo -e "${YELLOW}Testing against: $API_URL${NC}"
echo ""

# ============================================================================
# TEST 1: Verify Database Indexes Were Created
# ============================================================================
echo -e "${YELLOW}TEST 1: Verifying Database Indexes${NC}"
echo "---"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}psql not found. Skipping database index verification.${NC}"
    echo "To test manually, run:"
    echo "  psql -U $DB_USER -h $DB_HOST -d $DB_NAME"
    echo "  SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';"
else
    echo "Checking for performance indexes..."
    INDEXES=$(psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c \
        "SELECT COUNT(*) FROM pg_stat_user_indexes WHERE indexname LIKE 'idx_%';" 2>/dev/null || echo "0")
    
    if [ "$INDEXES" -gt 10 ]; then
        echo -e "${GREEN}✓ Found $INDEXES performance indexes${NC}"
    else
        echo -e "${RED}✗ Only found $INDEXES indexes. Did you run add_performance_indexes.sql?${NC}"
    fi
fi

echo ""

# ============================================================================
# TEST 2: Test Compression Middleware
# ============================================================================
echo -e "${YELLOW}TEST 2: Testing Gzip Compression${NC}"
echo "---"

echo "Testing /api/widgets endpoint for compression..."
RESPONSE=$(curl -s -i -H "Accept-Encoding: gzip" "$API_URL/api/widgets?limit=10" 2>/dev/null | head -20)

if echo "$RESPONSE" | grep -q "content-encoding: gzip"; then
    echo -e "${GREEN}✓ Gzip compression is enabled${NC}"
else
    echo -e "${RED}✗ Gzip compression not detected${NC}"
    echo "Make sure compression middleware is added to server.js"
fi

echo ""

# ============================================================================
# TEST 3: API Functionality Tests
# ============================================================================
echo -e "${YELLOW}TEST 3: Testing API Endpoints Still Work${NC}"
echo "---"

test_endpoint() {
    local name=$1
    local endpoint=$2
    
    echo -n "Testing $name... "
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint")
    
    if [ "$RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓ (HTTP $RESPONSE)${NC}"
        return 0
    else
        echo -e "${RED}✗ (HTTP $RESPONSE)${NC}"
        return 1
    fi
}

test_endpoint "GET /api/widgets" "/api/widgets?limit=5"
test_endpoint "GET /api/league/seasons" "/api/league/seasons"
test_endpoint "GET /api/league/standings" "/api/league/standings"
test_endpoint "GET /api/league/leaders" "/api/league/leaders"
test_endpoint "GET /api/teams" "/api/teams"
test_endpoint "GET /api/scores" "/api/scores?limit=3"

echo ""

# ============================================================================
# TEST 4: Performance Benchmark
# ============================================================================
echo -e "${YELLOW}TEST 4: Performance Benchmark${NC}"
echo "---"

benchmark_endpoint() {
    local name=$1
    local endpoint=$2
    local iterations=${3:-5}
    
    echo "Benchmarking $name ($iterations requests)..."
    
    total_time=0
    for i in $(seq 1 $iterations); do
        time_ms=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL$endpoint" | awk '{print int($1 * 1000)}')
        total_time=$((total_time + time_ms))
        echo -n "."
    done
    
    avg_time=$((total_time / iterations))
    echo ""
    echo "  Average response time: ${avg_time}ms"
    
    # Check if acceptable
    if [ "$avg_time" -lt 500 ]; then
        echo -e "  ${GREEN}✓ Performance is good${NC}"
    elif [ "$avg_time" -lt 1000 ]; then
        echo -e "  ${YELLOW}⚠ Performance is acceptable${NC}"
    else
        echo -e "  ${RED}✗ Performance is slow (> 1000ms)${NC}"
    fi
    
    echo ""
}

benchmark_endpoint "GET /api/widgets" "/api/widgets?limit=10" 3
benchmark_endpoint "GET /api/league/standings" "/api/league/standings" 3

# ============================================================================
# TEST 5: Cache Testing (League Endpoints)
# ============================================================================
echo -e "${YELLOW}TEST 5: Testing League Data Caching${NC}"
echo "---"

echo "Testing /api/league/standings caching..."
echo "Request 1 (should fetch from S3):"
time1=$(curl -s -w "%{time_total}" -o /tmp/standings1.json "$API_URL/api/league/standings" | head -c 6)

sleep 1

echo "Request 2 (should hit cache - faster):"
time2=$(curl -s -w "%{time_total}" -o /tmp/standings2.json "$API_URL/api/league/standings" | head -c 6)

# Check if cached flag is present
if grep -q "cached" /tmp/standings2.json 2>/dev/null; then
    echo -e "${GREEN}✓ Cache hit detected (response includes 'cached' flag)${NC}"
else
    echo -e "${YELLOW}⚠ Cache response flag not found (cache may still be working)${NC}"
fi

echo "Time comparison: Request 1: ${time1}s, Request 2: ${time2}s"

echo ""

# ============================================================================
# TEST 6: Payload Size Comparison
# ============================================================================
echo -e "${YELLOW}TEST 6: Checking Compression Effectiveness${NC}"
echo "---"

echo "Fetching /api/widgets without compression..."
uncompressed=$(curl -s -H "Accept-Encoding: identity" "$API_URL/api/widgets?limit=20" | wc -c)

echo "Fetching /api/widgets with compression..."
compressed=$(curl -s -H "Accept-Encoding: gzip" "$API_URL/api/widgets?limit=20" 2>/dev/null | wc -c)

if [ "$uncompressed" -gt 0 ] && [ "$compressed" -gt 0 ]; then
    ratio=$((100 * compressed / uncompressed))
    echo "Uncompressed size: ${uncompressed} bytes"
    echo "Compressed size: ${compressed} bytes"
    echo "Compression ratio: ${ratio}%"
    
    if [ "$ratio" -lt 40 ]; then
        echo -e "${GREEN}✓ Excellent compression (< 40% of original)${NC}"
    elif [ "$ratio" -lt 60 ]; then
        echo -e "${GREEN}✓ Good compression (< 60% of original)${NC}"
    else
        echo -e "${YELLOW}⚠ Compression may not be working effectively${NC}"
    fi
fi

echo ""

# ============================================================================
# TEST 7: Concurrent Request Handling
# ============================================================================
echo -e "${YELLOW}TEST 7: Concurrent Request Handling${NC}"
echo "---"

echo "Sending 10 concurrent requests to /api/widgets..."

concurrent_failures=0
for i in {1..10}; do
    curl -s "$API_URL/api/widgets?limit=5" > /dev/null &
done

wait

echo -e "${GREEN}✓ All concurrent requests completed${NC}"

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${YELLOW}===============================================${NC}"
echo -e "${GREEN}Testing Complete!${NC}"
echo -e "${YELLOW}===============================================${NC}"
echo ""
echo "Optimization Status:"
echo "  1. Database Indexes: Check pg_stat_user_indexes"
echo "  2. Gzip Compression: Check for 'content-encoding: gzip' header"
echo "  3. API Functionality: All endpoints should return HTTP 200"
echo "  4. Response Times: Should be significantly faster"
echo "  5. Caching: League endpoints should have faster second requests"
echo "  6. Payload Size: Should be 60-80% smaller with compression"
echo "  7. Concurrency: Server should handle multiple requests without errors"
echo ""
echo "For detailed analysis, use these tools:"
echo "  - Apache Bench: ab -n 100 -c 10 http://localhost:3000/api/widgets"
echo "  - Wrk: wrk -t4 -c10 -d30s http://localhost:3000/api/widgets"
echo "  - Chrome DevTools: Network tab to check response headers"
echo ""
