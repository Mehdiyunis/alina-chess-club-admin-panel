import type { NextConfig } from 'next';

if (process.argv.some((arg) => arg.includes('build'))) {
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Ensure noindex headers for all routes in addition to robots.txt and meta tags
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
