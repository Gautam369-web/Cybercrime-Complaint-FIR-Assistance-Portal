import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    // On Vercel / production, do not proxy to local 127.0.0.1:5175
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5175/api/:path*',
      },
    ];
  },
};

export default nextConfig;
