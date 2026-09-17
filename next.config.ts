import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product/logo images come from whichever competitor site the admin configures, so the
    // hostname allowlist can't be known ahead of time. Images are rendered `unoptimized`
    // (see ProductImage component) instead of proxying arbitrary external hosts through
    // Next's image optimizer.
    unoptimized: true,
  },
};

export default nextConfig;
