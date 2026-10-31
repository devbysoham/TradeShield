/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxies client /api/* calls to FastAPI backend on port 8000 (configurable via env)
    // This avoids CORS issues and keeps internal backend endpoints secluded
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${fastApiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

