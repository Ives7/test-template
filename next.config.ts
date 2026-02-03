import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
    serverMinification: false,
    webpackBuildWorker: true,
    turbopackTreeShaking: true,
    turbopackRemoveUnusedImports: true,
    turbopackRemoveUnusedExports: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  typedRoutes: true,
};

export default nextConfig;
