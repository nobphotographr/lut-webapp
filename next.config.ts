import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
  },
  images: {
    domains: [],
  },
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
