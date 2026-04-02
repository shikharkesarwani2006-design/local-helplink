import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    allowedDevOrigins: [
      '6000-firebase-studio-1771781827873.cluster-a6zx3cwnb5hnuwbgyxmofxpkfe.cloudworkstations.dev',
      '*.cloudworkstations.dev'
    ],
  },
};

export default nextConfig;
