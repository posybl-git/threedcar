import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    // Large immutable 3D assets: cache aggressively (rename the file to bust the cache).
    return [
      { source: '/(models|hdri|basis)/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};

export default nextConfig;
