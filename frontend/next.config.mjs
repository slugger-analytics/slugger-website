/** @type {import('next').NextConfig} */

// Origins that are allowed to embed widgets inside Slugger.
// Add the production widget domain(s) here as they are deployed.
const TRUSTED_WIDGET_ORIGINS = [
  'http://localhost:3000',  // local test-widget served by Next.js itself
  'https://slugger-alb-1518464736.us-east-2.elb.amazonaws.com',
  'https://alpb-analytics.com',
  'https://www.alpb-analytics.com',
  // 'https://your-widget.vercel.app',  ← add external widget domains here
];

const nextConfig = {
  // Explicitly enable PostCSS processing
  experimental: {
    esmExternals: true,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async headers() {
    return [
      {
        // Apply security headers to every Slugger page/API route
        source: '/(.*)',
        headers: [
          // ── Prevent Slugger itself from being iframe-embedded by strangers ──
          // SAMEORIGIN: only same-origin pages can embed Slugger.
          // If you ever need Slugger inside an external iframe, change to
          // ALLOW-FROM or use the CSP frame-ancestors directive below instead.
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },

          // ── Content-Security-Policy ──────────────────────────────────────
          // frame-src: which origins Slugger is allowed to load as <iframe>.
          //   → only the domains in TRUSTED_WIDGET_ORIGINS can be embedded.
          // frame-ancestors: which origins can embed Slugger pages.
          //   → 'self' means only same-origin (same effect as SAMEORIGIN above).
          // Adjust other directives to match your existing inline scripts/styles.
          {
            key: 'Content-Security-Policy',
            value: [
              `frame-src 'self' ${TRUSTED_WIDGET_ORIGINS.join(' ')}`,
              `frame-ancestors 'self'`,
            ].join('; '),
          },

          // ── Standard hardening headers ───────────────────────────────────
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control',     value: 'on' },
        ],
      },
    ];
  },
};

export default nextConfig;
