/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  images: {
    domains: ['rlttkzmpazgdkypvhtpd.supabase.co'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'crm.festivalim.pro'],
    },
  },
};

module.exports = nextConfig;
