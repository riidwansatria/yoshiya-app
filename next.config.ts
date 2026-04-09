import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  devIndicators: false,
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
} satisfies NextConfig;

export default withNextIntl(nextConfig);
