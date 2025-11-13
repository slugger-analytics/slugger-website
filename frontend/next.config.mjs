/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly enable PostCSS processing
  experimental: {
    esmExternals: true,
  },
};

export default nextConfig;
