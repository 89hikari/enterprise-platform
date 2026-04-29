import type { NextConfig } from 'next';

// standalone output is used inside Docker; avoid it on Windows dev machines
// where symlink creation requires elevated permissions.
const nextConfig: NextConfig = {
  output: process.env.NEXT_BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [];
  },
};

export default nextConfig;
