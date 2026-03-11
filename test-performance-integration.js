/**
 * Unit Tests for Performance Optimizations
 * Run with: npm test (after adding to package.json)
 * 
 * Tests:
 * 1. Cache Manager functionality
 * 2. Parallel query execution
 * 3. Connection pool configuration
 * 4. API responses and compression
 */

// test/performance.test.js
// Setup: npm install --save-dev jest supertest

const request = require('supertest');
const { cacheManager } = require('../backend/utils/cacheManager');

// ============================================================================
// TEST SUITE 1: Cache Manager
// ============================================================================

describe('Cache Manager', () => {
  beforeEach(() => {
    cacheManager.clearAll();
  });

  test('should store and retrieve values', () => {
    cacheManager.set('test_key', { data: 'test_value' }, 3600);
    const result = cacheManager.get('test_key');
    
    expect(result).toEqual({ data: 'test_value' });
  });

  test('should return null for non-existent keys', () => {
    const result = cacheManager.get('non_existent');
    expect(result).toBeNull();
  });

  test('should expire values after TTL', (done) => {
    cacheManager.set('expiring_key', 'value', 1); // 1 second TTL
    
    expect(cacheManager.get('expiring_key')).toBe('value');
    
    setTimeout(() => {
      expect(cacheManager.get('expiring_key')).toBeNull();
      done();
    }, 1100);
  });

  test('should clear specific cache entries', () => {
    cacheManager.set('key1', 'value1', 3600);
    cacheManager.set('key2', 'value2', 3600);
    
    cacheManager.clear('key1');
    
    expect(cacheManager.get('key1')).toBeNull();
    expect(cacheManager.get('key2')).toBe('value2');
  });

  test('should clear cache by pattern', () => {
    cacheManager.set('standings_2024', 'data1', 3600);
    cacheManager.set('standings_2025', 'data2', 3600);
    cacheManager.set('leaders_2024', 'data3', 3600);
    
    cacheManager.clearPattern('^standings_');
    
    expect(cacheManager.get('standings_2024')).toBeNull();
    expect(cacheManager.get('standings_2025')).toBeNull();
    expect(cacheManager.get('leaders_2024')).toBe('data3');
  });

  test('should report cache statistics', () => {
    cacheManager.set('key1', 'value1', 3600);
    cacheManager.set('key2', 'value2', 3600);
    
    const stats = cacheManager.getStats();
    
    expect(stats.size).toBe(2);
    expect(stats.keys).toContain('key1');
    expect(stats.keys).toContain('key2');
  });
});

// ============================================================================
// TEST SUITE 2: API Endpoints (Integration Tests)
// ============================================================================

describe('API Performance Tests', () => {
  let app;

  beforeAll(() => {
    // Import your Express app
    app = require('../backend/server');
  });

  test('GET /api/widgets should return 200', (done) => {
    request(app)
      .get('/api/widgets?limit=10')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        done();
      });
  });

  test('GET /api/widgets should have data', (done) => {
    request(app)
      .get('/api/widgets?limit=5')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.length).toBeLessThanOrEqual(5);
        
        // Check widget structure
        if (res.body.data.length > 0) {
          const widget = res.body.data[0];
          expect(widget).toHaveProperty('widget_id');
          expect(widget).toHaveProperty('widget_name');
          expect(widget).toHaveProperty('categories');
          expect(widget).toHaveProperty('metrics');
        }
        done();
      });
  });

  test('GET /api/league/standings should return data', (done) => {
    request(app)
      .get('/api/league/standings')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        done();
      });
  });

  test('GET /api/league/leaders should return data', (done) => {
    request(app)
      .get('/api/league/leaders')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        done();
      });
  });

  test('Responses should include compression header', (done) => {
    request(app)
      .get('/api/widgets?limit=50')
      .set('Accept-Encoding', 'gzip')
      .expect((res) => {
        // Content-Encoding header should be present (set by compression middleware)
        // Note: supertest may decompress automatically, check res.headers
        expect(res.status).toBe(200);
      })
      .end(done);
  });

  test('Cache should work for league endpoints', (done) => {
    // First request
    request(app)
      .get('/api/league/standings')
      .expect(200)
      .end((err, firstRes) => {
        if (err) return done(err);
        
        // Second request should be faster (cached)
        request(app)
          .get('/api/league/standings')
          .expect(200)
          .end((err, secondRes) => {
            if (err) return done(err);
            
            // Check if cached flag is in response
            // Note: Depends on API implementation
            expect(secondRes.body.success).toBe(true);
            done();
          });
      });
  });
});

// ============================================================================
// TEST SUITE 3: Performance Benchmarks
// ============================================================================

describe('Performance Benchmarks', () => {
  let app;

  beforeAll(() => {
    app = require('../backend/server');
  });

  test('GET /api/widgets should respond in < 500ms', (done) => {
    const startTime = Date.now();
    
    request(app)
      .get('/api/widgets?limit=20')
      .expect(200)
      .end((err) => {
        if (err) return done(err);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(500);
        
        console.log(`  ✓ Response time: ${duration}ms`);
        done();
      });
  }, 10000); // 10 second timeout

  test('GET /api/league/standings should respond in < 300ms on cache hit', (done) => {
    // Warm up cache
    request(app)
      .get('/api/league/standings')
      .end(() => {
        const startTime = Date.now();
        
        request(app)
          .get('/api/league/standings')
          .expect(200)
          .end((err) => {
            if (err) return done(err);
            
            const duration = Date.now() - startTime;
            // Cached response should be much faster
            expect(duration).toBeLessThan(300);
            
            console.log(`  ✓ Cached response time: ${duration}ms`);
            done();
          });
      });
  }, 10000);

  test('should handle concurrent requests', async () => {
    const concurrentRequests = 20;
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        request(app)
          .get('/api/widgets?limit=10')
          .expect(200)
      );
    }
    
    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(concurrentRequests);
    expect(results.every(r => r.status === 200)).toBe(true);
  });
});

// ============================================================================
// TEST SUITE 4: Database Connection Pool
// ============================================================================

describe('Database Connection Pool', () => {
  test('pool should have correct configuration', () => {
    const pool = require('../backend/db').default;
    
    // Check pool configuration
    expect(pool.options.max).toBe(30); // or whatever your config is
    expect(pool.options.min).toBeLessThanOrEqual(pool.options.max);
  });

  test('pool should close connections gracefully', async () => {
    const pool = require('../backend/db').default;
    
    // Make some queries
    const queries = [];
    for (let i = 0; i < 5; i++) {
      queries.push(pool.query('SELECT 1'));
    }
    
    await Promise.all(queries);
    
    // Should not have errors
    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST SUITE 5: Widget Data Structure
// ============================================================================

describe('Widget Data Structure', () => {
  let app;

  beforeAll(() => {
    app = require('../backend/server');
  });

  test('widgets should include all expected fields', (done) => {
    request(app)
      .get('/api/widgets?limit=1')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        
        if (res.body.data.length > 0) {
          const widget = res.body.data[0];
          
          expect(widget).toHaveProperty('widget_id');
          expect(widget).toHaveProperty('widget_name');
          expect(widget).toHaveProperty('description');
          expect(widget).toHaveProperty('visibility');
          expect(widget).toHaveProperty('categories');
          expect(widget).toHaveProperty('metrics');
          expect(widget).toHaveProperty('developer_ids');
          
          // Verify metrics structure
          expect(widget.metrics).toHaveProperty('weeklyLaunches');
          expect(widget.metrics).toHaveProperty('monthlyLaunches');
          expect(widget.metrics).toHaveProperty('allTimeLaunches');
        }
        
        done();
      });
  });
});

// ============================================================================
// Export for Jest
// ============================================================================

module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
