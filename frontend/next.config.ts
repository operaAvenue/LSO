import type { NextConfig } from "next";

const backendInternal =
  process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendInternal}/api/v1/:path*`,
      },
      {
        source: "/outputs/:path*",
        destination: `${backendInternal}/outputs/:path*`,
      },
    ];
  },
};

export default nextConfig;
