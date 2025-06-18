import type { NextConfig } from "next";

// Bundle analyzer - only load when needed
const withBundleAnalyzer = process.env.ANALYZE === 'true' 
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config: NextConfig) => config;

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
  // output: 'standalone', // Vercelでは自動設定
  
  // Webpack最適化（安全版）
  webpack: (config, { isServer }) => {
    // WebGL関連ファイルの処理
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    
    // クライアントサイド専用の最適化
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    
    return config;
  },
  
  // セキュリティとパフォーマンスヘッダー（COEP無効化）
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
