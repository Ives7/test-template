import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
    serverMinification: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  typedRoutes: true,
};

export default nextConfig;
