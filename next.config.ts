import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/sign-in',
        destination: '/giris',
        permanent: true,
      },
      {
        source: '/sign-up',
        destination: '/giris?mode=kayit',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
