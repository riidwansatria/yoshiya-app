import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['192.168.0.57'],
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ]
  },
} satisfies NextConfig;

export default withNextIntl(nextConfig);
