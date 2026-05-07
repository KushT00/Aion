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
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
