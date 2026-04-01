import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (isProduction && !dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
