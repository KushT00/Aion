import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images for deployment
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
};

export default nextConfig;
