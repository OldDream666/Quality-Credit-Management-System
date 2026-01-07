import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'tinymce': 'tinymce/tinymce.min.js',
      };
    }
    return config;
  },
  experimental: {
    // @ts-ignore
    turbo: {
      resolveAlias: {
        'tinymce': 'tinymce/tinymce.min.js',
      },
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
            ].join('; ')
          }
        ],
      },
    ];
  },
};

export default nextConfig;
