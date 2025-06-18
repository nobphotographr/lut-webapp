import type { NextConfig } from "next";
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // 実験的機能の設定
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  
  // 画像最適化設定
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1年
  },
  
  // 圧縮とキャッシング
  compress: true,
  poweredByHeader: false,
  
  // Static generation最適化
  output: 'standalone',
  
  // Webpack最適化
  webpack: (config, { dev, isServer }) => {
    // プロダクション用の最適化
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }
    
    // WebGL関連ファイルの処理
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    
    return config;
  },
  
  // セキュリティとパフォーマンスヘッダー
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      },
      // 静的アセットの長期キャッシュ
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};

export default withBundleAnalyzer(nextConfig);
