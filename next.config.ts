import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The app enforces a 1.5 MB XLSX limit; this leaves multipart overhead.
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
